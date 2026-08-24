"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  eventoSchema,
  validarPortada,
  extensionDePortada,
} from "@/lib/validation/eventos";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const BUCKET = "eventos-portadas";

export type EventoState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type EventoCard = {
  id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string;
  direccion: string | null;
  portada_url: string;
};

export type Evento = EventoCard & {
  descripcion: string | null;
  hora_termino: string;
  lat: number;
  lng: number;
  capacidad: number | null;
  precio_clp: number;
};

export async function crearEventoAction(
  _prev: EventoState,
  formData: FormData
): Promise<EventoState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { ok: false, error: "Debes iniciar sesion para crear un evento." };
  }

  if (!(await checkRateLimit(`crear-evento:${auth.user.id}`, 5, 600))) {
    return { ok: false, error: "Creaste varios eventos seguidos. Intenta en unos minutos." };
  }

  const parsed = eventoSchema.safeParse({
    nombre: formData.get("nombre") ?? "",
    descripcion: formData.get("descripcion") ?? "",
    fecha: formData.get("fecha") ?? "",
    horaInicio: formData.get("horaInicio") ?? "",
    horaTermino: formData.get("horaTermino") ?? "",
    lat: formData.get("lat") ?? "",
    lng: formData.get("lng") ?? "",
    direccion: formData.get("direccion") ?? "",
    sinLimiteCapacidad: formData.get("sinLimiteCapacidad") ?? "",
    capacidad: formData.get("capacidad") || undefined,
    precioClp: formData.get("precioClp") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del formulario.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Se valida la foto antes de subir nada, para no dejar archivos huerfanos.
  const portada = validarPortada(formData.get("portada"));
  if ("error" in portada) {
    return { ok: false, error: portada.error, fieldErrors: { portada: [portada.error] } };
  }

  const d = parsed.data;
  const ruta = `${auth.user.id}/${crypto.randomUUID()}.${extensionDePortada(portada.file.type)}`;

  const subida = await supabase.storage
    .from(BUCKET)
    .upload(ruta, portada.file, { contentType: portada.file.type });

  if (subida.error) {
    return { ok: false, error: `No se pudo subir la foto: ${subida.error.message}` };
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(ruta);

  const { data: creado, error } = await supabase
    .from("eventos")
    .insert({
      owner_id: auth.user.id,
      nombre: d.nombre,
      descripcion: d.descripcion || null,
      fecha: d.fecha,
      hora_inicio: d.horaInicio,
      hora_termino: d.horaTermino,
      lat: d.lat,
      lng: d.lng,
      ubicacion: `SRID=4326;POINT(${d.lng} ${d.lat})`,
      direccion: d.direccion || null,
      portada_url: publicUrl.publicUrl,
      capacidad: d.sinLimiteCapacidad ? null : d.capacidad,
      precio_clp: d.precioClp,
    })
    .select("id")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([ruta]);
    return { ok: false, error: `No se pudo crear el evento: ${error.message}` };
  }

  revalidatePath("/");
  redirect(`/eventos/${creado.id}`);
}

/** La portada debe renderizar aunque Supabase aun no este conectado (mismo criterio que TopBar). */
export async function listarEventosProximos(limite = 8): Promise<EventoCard[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("eventos")
      .select("id, nombre, fecha, hora_inicio, direccion, portada_url")
      .gte("fecha", new Date().toLocaleDateString("en-CA"))
      .order("fecha", { ascending: true })
      .order("hora_inicio", { ascending: true })
      .limit(limite);

    if (error) throw new Error(error.message);
    return data ?? [];
  } catch (e) {
    // Next usa excepciones con `digest` como control de flujo (redirect, render dinamico).
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[eventos] no se pudieron cargar los eventos proximos:", e);
    return [];
  }
}

export async function obtenerEvento(id: string): Promise<Evento | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("eventos")
    .select(
      "id, nombre, descripcion, fecha, hora_inicio, hora_termino, lat, lng, direccion, portada_url, capacidad, precio_clp"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el evento: ${error.message}`);
  return data;
}
