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
  precio_clp?: number;
};

export type Evento = EventoCard & {
  owner_id: string;
  descripcion: string | null;
  hora_termino: string;
  lat: number;
  lng: number;
  capacidad: number | null;
  precio_clp: number;
};

/** Lee los campos del formulario, comunes al alta y a la edicion. */
function leerFormulario(formData: FormData) {
  return eventoSchema.safeParse({
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
}

/**
 * Ruta dentro del bucket a partir de la URL publica, para poder borrar la
 * foto vieja. Devuelve null si la URL no es de nuestro Storage.
 */
function rutaDePortada(url: string): string | null {
  const marca = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marca);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length));
}

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

  const parsed = leerFormulario(formData);

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
      .select("id, nombre, fecha, hora_inicio, direccion, portada_url, precio_clp")
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
      "id, owner_id, nombre, descripcion, fecha, hora_inicio, hora_termino, lat, lng, direccion, portada_url, capacidad, precio_clp"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el evento: ${error.message}`);
  return data;
}

/**
 * Evento del usuario en sesion. Devuelve null si no es suyo: las policies de
 * SELECT sobre eventos son publicas, asi que el filtro por owner_id es lo
 * unico que separa "ver" de "administrar".
 */
export async function obtenerEventoPropio(id: string): Promise<Evento | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("eventos")
    .select(
      "id, owner_id, nombre, descripcion, fecha, hora_inicio, hora_termino, lat, lng, direccion, portada_url, capacidad, precio_clp"
    )
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el evento: ${error.message}`);
  return data;
}

export async function editarEventoAction(
  _prev: EventoState,
  formData: FormData
): Promise<EventoState> {
  const id = String(formData.get("eventoId") ?? "");
  if (!id) return { ok: false, error: "Evento no valido." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { ok: false, error: "Debes iniciar sesion para editar un evento." };
  }

  const { data: actual } = await supabase
    .from("eventos")
    .select("id, portada_url")
    .eq("id", id)
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (!actual) return { ok: false, error: "No encontramos ese evento en tu cuenta." };

  const parsed = leerFormulario(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos del formulario.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // La foto es opcional al editar: si no suben una nueva, se conserva la actual.
  const archivo = formData.get("portada");
  const cambiaPortada = archivo instanceof File && archivo.size > 0;
  let portadaUrl = actual.portada_url;
  let rutaNueva: string | null = null;

  if (cambiaPortada) {
    const portada = validarPortada(archivo);
    if ("error" in portada) {
      return { ok: false, error: portada.error, fieldErrors: { portada: [portada.error] } };
    }

    rutaNueva = `${auth.user.id}/${crypto.randomUUID()}.${extensionDePortada(portada.file.type)}`;
    const subida = await supabase.storage
      .from(BUCKET)
      .upload(rutaNueva, portada.file, { contentType: portada.file.type });

    if (subida.error) {
      return { ok: false, error: `No se pudo subir la foto: ${subida.error.message}` };
    }
    portadaUrl = supabase.storage.from(BUCKET).getPublicUrl(rutaNueva).data.publicUrl;
  }

  const d = parsed.data;
  const { error } = await supabase
    .from("eventos")
    .update({
      nombre: d.nombre,
      descripcion: d.descripcion || null,
      fecha: d.fecha,
      hora_inicio: d.horaInicio,
      hora_termino: d.horaTermino,
      lat: d.lat,
      lng: d.lng,
      ubicacion: `SRID=4326;POINT(${d.lng} ${d.lat})`,
      direccion: d.direccion || null,
      portada_url: portadaUrl,
      capacidad: d.sinLimiteCapacidad ? null : d.capacidad,
      precio_clp: d.precioClp,
    })
    .eq("id", id);

  if (error) {
    if (rutaNueva) await supabase.storage.from(BUCKET).remove([rutaNueva]);
    return { ok: false, error: `No se pudo guardar el evento: ${error.message}` };
  }

  // Recien con el update confirmado se descarta la foto anterior.
  if (rutaNueva) {
    const vieja = rutaDePortada(actual.portada_url);
    if (vieja) await supabase.storage.from(BUCKET).remove([vieja]);
  }

  revalidatePath("/");
  revalidatePath(`/eventos/${id}`);
  revalidatePath(`/mis-eventos/${id}`);
  redirect(`/mis-eventos/${id}?guardado=1`);
}

export async function eliminarEventoAction(
  _prev: EventoState,
  formData: FormData
): Promise<EventoState> {
  const id = String(formData.get("eventoId") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { ok: false, error: "Debes iniciar sesion para eliminar un evento." };
  }

  const { data: evento } = await supabase
    .from("eventos")
    .select("id, nombre, portada_url")
    .eq("id", id)
    .eq("owner_id", auth.user.id)
    .maybeSingle();

  if (!evento) return { ok: false, error: "No encontramos ese evento en tu cuenta." };

  // El nombre tipeado se revalida en el servidor: el modal es una ayuda de UI,
  // no el control. Se ignoran mayusculas y espacios de borde, nada mas.
  const iguales =
    confirmacion.trim().toLocaleLowerCase("es") === evento.nombre.trim().toLocaleLowerCase("es");

  if (!iguales) {
    return {
      ok: false,
      error: "El nombre no coincide con el del evento.",
      fieldErrors: { confirmacion: ["Escribe el nombre exacto del evento."] },
    };
  }

  const { error } = await supabase.from("eventos").delete().eq("id", id);
  if (error) return { ok: false, error: `No se pudo eliminar el evento: ${error.message}` };

  const ruta = rutaDePortada(evento.portada_url);
  if (ruta) await supabase.storage.from(BUCKET).remove([ruta]);

  revalidatePath("/");
  revalidatePath("/mis-eventos");
  redirect("/mis-eventos?eliminado=1");
}
