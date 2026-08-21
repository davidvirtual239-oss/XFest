import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente service_role: BYPASSEA RLS. Uso exclusivo en webhooks y jobs.
 * Nunca importar desde un archivo que pueda terminar en el bundle del cliente.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
