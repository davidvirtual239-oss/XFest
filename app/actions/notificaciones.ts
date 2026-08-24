"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Notificacion = {
  id: string;
  titulo: string;
  detalle: string | null;
  evento_id: string | null;
  leida_en: string | null;
  creado_en: string;
};

const MAXIMO = 15;

/**
 * Avisos del usuario en sesion. Las policies de notificaciones ya filtran por
 * destinatario, asi que aca no hace falta repetir el where por usuario.
 */
export async function listarNotificaciones(): Promise<{
  items: Notificacion[];
  sinLeer: number;
}> {
  const vacio = { items: [], sinLeer: 0 };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return vacio;

    const { data, error } = await supabase
      .from("notificaciones")
      .select("id, titulo, detalle, evento_id, leida_en, creado_en")
      .order("creado_en", { ascending: false })
      .limit(MAXIMO);

    if (error) throw new Error(error.message);

    const items = (data ?? []) as Notificacion[];
    return { items, sinLeer: items.filter((n) => n.leida_en == null).length };
  } catch (e) {
    // La campana no puede tumbar el TopBar (mismo criterio que la sesion).
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[notificaciones] no se pudieron cargar:", e);
    return vacio;
  }
}

export async function marcarNotificacionesLeidas() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notificaciones")
    .update({ leida_en: new Date().toISOString() })
    .eq("usuario_id", user.id)
    .is("leida_en", null);

  // El TopBar se renderiza en el servidor: sin esto el badge queda pegado.
  revalidatePath("/", "layout");
}
