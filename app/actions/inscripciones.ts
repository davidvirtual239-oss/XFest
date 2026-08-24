"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { inscripcionSchema } from "@/lib/validation/inscripcion";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearPago } from "@/lib/flow/client";
import { checkRateLimit } from "@/lib/rate-limit";

export type InscripcionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type EstadoInscripcion = "pendiente" | "confirmada" | "cancelada";

export type Participante = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rut: string;
  estado: EstadoInscripcion;
  monto_clp: number;
  creado_en: string;
};

/** Mensajes de las excepciones de inscribir_en_evento(), en criollo. */
const ERRORES_RPC: Record<string, string> = {
  EVENTO_NO_EXISTE: "Este evento ya no está disponible.",
  EVENTO_TERMINADO: "Este evento ya pasó.",
  SIN_CUPOS: "Se agotaron los cupos de este evento.",
  YA_INSCRITO: "Ese RUT ya está inscrito en este evento.",
};

function traducirErrorRpc(mensaje: string): string {
  const clave = Object.keys(ERRORES_RPC).find((k) => mensaje.includes(k));
  return clave ? ERRORES_RPC[clave] : "No pudimos completar tu inscripción. Intenta de nuevo.";
}

/**
 * Datos con los que se precarga el formulario cuando hay sesion iniciada.
 * El telefono sale del perfil; nombre y correo, del proveedor de identidad.
 */
export async function datosPrellenados(): Promise<{
  nombre: string;
  email: string;
  telefono: string;
}> {
  const vacio = { nombre: "", email: "", telefono: "" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return vacio;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, telefono")
    .eq("id", user.id)
    .maybeSingle();

  return {
    nombre:
      perfil?.nombre ??
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      "",
    email: user.email ?? "",
    telefono: perfil?.telefono ?? "",
  };
}

export async function inscribirseAction(
  _prev: InscripcionState,
  formData: FormData
): Promise<InscripcionState> {
  const eventoId = String(formData.get("eventoId") ?? "");
  if (!eventoId) return { ok: false, error: "Evento no válido." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (!(await checkRateLimit(`inscribirse:${ip}`, 10, 600))) {
    return { ok: false, error: "Demasiados intentos. Espera unos minutos." };
  }

  const parsed = inscripcionSchema.safeParse({
    nombre: formData.get("nombre") ?? "",
    email: formData.get("email") ?? "",
    telefono: formData.get("telefono") ?? "",
    rut: formData.get("rut") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del formulario.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const d = parsed.data;
  const supabase = await createClient();

  // El RPC valida cupos y fecha, y decide si queda confirmada o pendiente de pago.
  const { data, error } = await supabase.rpc("inscribir_en_evento", {
    p_evento_id: eventoId,
    p_nombre: d.nombre,
    p_email: d.email,
    p_telefono: d.telefono,
    p_rut: d.rut,
  });

  if (error) return { ok: false, error: traducirErrorRpc(error.message) };

  const inscripcion = (Array.isArray(data) ? data[0] : data) as {
    id: string;
    estado: EstadoInscripcion;
    monto_clp: number;
  } | null;

  if (!inscripcion) {
    return { ok: false, error: "No pudimos completar tu inscripción. Intenta de nuevo." };
  }

  // Evento gratis: no hay nada que cobrar, ya quedo confirmada.
  if (inscripcion.monto_clp === 0) {
    revalidatePath(`/eventos/${eventoId}`);
    redirect(`/eventos/${eventoId}/inscripcion?ref=${inscripcion.id}`);
  }

  // Evento pagado: orden + cobro en Flow. El cupo queda tomado mientras tanto.
  let destino: string;
  try {
    destino = await iniciarPago({
      inscripcionId: inscripcion.id,
      eventoId,
      montoClp: inscripcion.monto_clp,
      email: d.email,
    });
  } catch (e) {
    // Sin pago no hay inscripcion: se libera el cupo en vez de dejarlo colgado.
    await liberarInscripcion(inscripcion.id);
    console.error("[inscripciones] fallo al iniciar el pago:", e);
    return {
      ok: false,
      error: "No pudimos iniciar el pago. Intenta nuevamente en unos minutos.",
    };
  }

  redirect(destino);
}

/** Crea la orden, la enlaza con la inscripcion y devuelve la URL de Flow. */
async function iniciarPago(p: {
  inscripcionId: string;
  eventoId: string;
  montoClp: number;
  email: string;
}): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: evento } = await supabase
    .from("eventos")
    .select("nombre")
    .eq("id", p.eventoId)
    .maybeSingle();

  // ordenes no tiene policy de insert: entra por service_role.
  const admin = createAdminClient();
  const { data: orden, error } = await admin
    .from("ordenes")
    .insert({
      comprador_id: user?.id ?? null,
      evento_id: p.eventoId,
      monto_clp: p.montoClp,
      // La inscripcion ES la orden de comercio: unica y trazable en ambos lados.
      commerce_order: p.inscripcionId,
      email: p.email,
    })
    .select("id")
    .single();

  if (error) throw new Error(`orden: ${error.message}`);

  const { error: enlaceError } = await admin
    .from("inscripciones")
    .update({ orden_id: orden.id })
    .eq("id", p.inscripcionId);

  if (enlaceError) throw new Error(`enlace orden: ${enlaceError.message}`);

  const { redirectUrl } = await crearPago({
    commerceOrder: p.inscripcionId,
    subject: `XFest — ${evento?.nombre ?? "Entrada"}`,
    amountClp: p.montoClp,
    email: p.email,
  });

  return redirectUrl;
}

async function liberarInscripcion(id: string) {
  try {
    await createAdminClient()
      .from("inscripciones")
      .update({ estado: "cancelada" })
      .eq("id", id);
  } catch (e) {
    console.error("[inscripciones] no se pudo liberar el cupo:", e);
  }
}

/** Estado de una inscripcion para la pantalla de confirmacion. */
export async function obtenerInscripcion(
  id: string
): Promise<{ estado: EstadoInscripcion; nombre: string; email: string; monto_clp: number } | null> {
  // Se lee con service_role: quien se inscribe sin cuenta no pasa ninguna RLS,
  // y el id (uuid v4) es la unica credencial de esta pantalla.
  const { data } = await createAdminClient()
    .from("inscripciones")
    .select("estado, nombre, email, monto_clp")
    .eq("id", id)
    .maybeSingle();

  return data;
}

/** Lista de asistentes de un evento. RLS ya limita esto al organizador. */
export async function listarParticipantes(eventoId: string): Promise<Participante[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inscripciones")
    .select("id, nombre, email, telefono, rut, estado, monto_clp, creado_en")
    .eq("evento_id", eventoId)
    .order("creado_en", { ascending: false });

  if (error) throw new Error(`No pudimos cargar los participantes: ${error.message}`);
  return (data ?? []) as Participante[];
}

/** Cupos tomados (incluye los pendientes de pago): RPC publico. */
export async function contarInscritos(eventoId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("evento_inscritos", { p_evento_id: eventoId });
  if (error) return 0;
  return data ?? 0;
}
