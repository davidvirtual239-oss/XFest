"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Cierra la sesion y limpia el cache de rutas.
 * Sin revalidatePath, el TopBar renderizado en el servidor seguiria
 * mostrando al usuario logueado hasta la siguiente navegacion dura.
 */
export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
