"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  searchSchema,
  searchParamsToQueryString,
  RESULTADOS_POR_PAGINA,
  type SearchParams,
} from "@/lib/validation/search";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export type SearchState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type EventoResultado = {
  id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string;
  direccion: string | null;
  portada_url: string;
  precio_clp: number;
  capacidad: number | null;
  distancia_km: number | null;
};

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

  const qs = searchParamsToQueryString(parsed.data);
  redirect(qs ? `/eventos?${qs}` : "/eventos");
}

export async function buscarEventos(params: SearchParams): Promise<EventoResultado[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("buscar_eventos", {
    p_query: params.q || null,
    p_lat: params.lat ?? null,
    p_lng: params.lng ?? null,
    p_radio_m: params.radioKm * 1000,
    p_limit: RESULTADOS_POR_PAGINA,
    p_offset: (params.page - 1) * RESULTADOS_POR_PAGINA,
  });

  if (error) throw new Error(`Busqueda fallida: ${error.message}`);
  return data ?? [];
}
