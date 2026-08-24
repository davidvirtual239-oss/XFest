"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { valoracionSchema } from "@/lib/validation/valoraciones";

export type ValoracionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Guarda (o actualiza) la valoracion del usuario para un evento.
 *
 * La elegibilidad NO se valida aqui: vive en la policy de INSERT, que
 * llama a puede_valorar(). Comprobarla solo en TypeScript seria una
 * sugerencia; en la policy es una garantia, incluso si alguien llama
 * a PostgREST directamente con su token.
 */
export async function guardarValoracion(
  _prev: ValoracionState,
  formData: FormData
): Promise<ValoracionState> {
  const parsed = valoracionSchema.safeParse({
    eventoId: formData.get("eventoId"),
    estrellasEvento: formData.get("estrellasEvento"),
    estrellasOrganizador: formData.get("estrellasOrganizador"),
    comentario: formData.get("comentario") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Inicia sesión para valorar." };

  const d = parsed.data;
  const { error } = await supabase.from("valoraciones").upsert(
    {
      autor_id: user.id,
      evento_id: d.eventoId,
      // organizador_id lo escribe el trigger; enviarlo desde el cliente
      // permitiria falsear a quien se le suma la reputacion.
      organizador_id: user.id,
      estrellas_evento: d.estrellasEvento,
      estrellas_organizador: d.estrellasOrganizador,
      comentario: d.comentario || null,
    },
    { onConflict: "autor_id,evento_id" }
  );

  if (error) {
    // La policy rechaza si el evento no terminó, si no confirmó asistencia
    // o si es su propio evento.
    if (error.code === "42501") {
      return {
        ok: false,
        error: "Solo puedes valorar una fiesta a la que confirmaste asistencia y que ya terminó.",
      };
    }
    console.error("[valoraciones]", error);
    return { ok: false, error: "No pudimos guardar tu valoración." };
  }

  revalidatePath(`/eventos/${d.eventoId}`);
  revalidatePath("/perfil");
  return { ok: true };
}

export type Valoracion = {
  id: string;
  evento_id: string;
  estrellas_evento: number;
  estrellas_organizador: number;
  comentario: string | null;
  creado_en: string;
};

/** Valoración propia para un evento, si existe. */
export async function miValoracion(eventoId: string): Promise<Valoracion | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("valoraciones")
    .select("id, evento_id, estrellas_evento, estrellas_organizador, comentario, creado_en")
    .eq("autor_id", user.id)
    .eq("evento_id", eventoId)
    .maybeSingle();

  return (data as Valoracion) ?? null;
}

/** ¿El usuario cumple las condiciones para valorar este evento? */
export async function puedeValorar(eventoId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("puede_valorar", { p_evento_id: eventoId });
  if (error) return false;
  return Boolean(data);
}

export type Reputacion = { promedio: number; total: number };

export async function reputacionEvento(eventoId: string): Promise<Reputacion> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("eventos_reputacion")
    .select("promedio, total")
    .eq("evento_id", eventoId)
    .maybeSingle();
  return { promedio: data?.promedio ?? 0, total: data?.total ?? 0 };
}

export async function reputacionOrganizador(organizadorId: string): Promise<Reputacion> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizadores_reputacion")
    .select("promedio, total")
    .eq("organizador_id", organizadorId)
    .maybeSingle();
  return { promedio: data?.promedio ?? 0, total: data?.total ?? 0 };
}
