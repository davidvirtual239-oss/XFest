"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { marcarSchema, type EstadoAsistencia } from "@/lib/validation/asistencias";

export type AsistenciaResult = { ok: boolean; estado?: EstadoAsistencia | null; error?: string };

/**
 * Marca, cambia o quita la asistencia del usuario a un evento.
 * upsert sobre la PK (user_id, evento_id): pasar de "guardado" a
 * "confirmado" no crea una fila nueva.
 */
export async function marcarAsistencia(
  eventoId: string,
  estado: EstadoAsistencia | null
): Promise<AsistenciaResult> {
  const parsed = marcarSchema.safeParse({ eventoId, estado });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para guardar fiestas." };

  if (parsed.data.estado === null) {
    const { error } = await supabase
      .from("asistencias")
      .delete()
      .eq("user_id", user.id)
      .eq("evento_id", parsed.data.eventoId);
    if (error) return { ok: false, error: "No pudimos quitar la marca." };
  } else {
    const { error } = await supabase.from("asistencias").upsert(
      { user_id: user.id, evento_id: parsed.data.eventoId, estado: parsed.data.estado },
      { onConflict: "user_id,evento_id" }
    );
    if (error) {
      // El trigger de aforo aborta la transaccion con este mensaje.
      if (error.message?.includes("AFORO_COMPLETO")) {
        return { ok: false, error: "Esta fiesta ya llegó a su aforo." };
      }
      return { ok: false, error: "No pudimos guardar tu asistencia." };
    }
  }

  revalidatePath(`/eventos/${parsed.data.eventoId}`);
  revalidatePath("/perfil");
  return { ok: true, estado: parsed.data.estado };
}

/** Estado actual del usuario para un evento (null si no lo marcó). */
export async function obtenerAsistencia(eventoId: string): Promise<EstadoAsistencia | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("asistencias")
    .select("estado")
    .eq("user_id", user.id)
    .eq("evento_id", eventoId)
    .maybeSingle();

  return (data?.estado as EstadoAsistencia) ?? null;
}

export type Cupos = {
  capacidad: number | null;
  confirmados: number;
  /** null = sin limite declarado. */
  disponibles: number | null;
  agotado: boolean;
};

/**
 * Aforo publico del evento. Sale de la vista agregada, nunca de la tabla:
 * las asistencias son privadas, el numero no.
 */
export async function obtenerCupos(eventoId: string): Promise<Cupos> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("eventos_cupos")
    .select("capacidad, confirmados, disponibles, agotado")
    .eq("evento_id", eventoId)
    .maybeSingle();

  return {
    capacidad: data?.capacidad ?? null,
    confirmados: data?.confirmados ?? 0,
    disponibles: data?.disponibles ?? null,
    agotado: data?.agotado ?? false,
  };
}
