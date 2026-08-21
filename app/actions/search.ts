"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  searchSchema,
  searchParamsToQueryString,
  type SearchParams,
} from "@/lib/validation/search";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export type SearchState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Server Action del buscador del Top Bar.
 * Valida -> normaliza -> redirige a /buscar?<qs> (URL como estado compartible).
 * La consulta real vive en el Server Component de /buscar, cacheable por URL.
 */
export async function buscarAction(
  _prev: SearchState,
  formData: FormData
): Promise<SearchState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (!(await checkRateLimit(`buscar:${ip}`, 30, 60))) {
    return { ok: false, error: "Demasiadas busquedas. Intenta en un minuto." };
  }

  const parsed = searchSchema.safeParse({
    q: formData.get("q") ?? "",
    categoria: formData.get("categoria") || undefined,
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    radioKm: formData.get("radioKm") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisa los datos de busqueda.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  if (!parsed.data.q && !parsed.data.categoria) {
    return { ok: false, error: "Escribe que fiesta quieres o elige una categoria." };
  }

  redirect(`/buscar?${searchParamsToQueryString(parsed.data)}`);
}

/** Consulta PostGIS usada por el Server Component de /buscar. */
export async function buscarProveedores(params: SearchParams) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("buscar_proveedores", {
    p_query: params.q || null,
    p_categoria: params.categoria ?? null,
    p_lat: params.lat ?? null,
    p_lng: params.lng ?? null,
    p_radio_m: params.radioKm * 1000,
    p_limit: 12,
    p_offset: (params.page - 1) * 12,
  });

  if (error) throw new Error(`Busqueda fallida: ${error.message}`);
  return data ?? [];
}
