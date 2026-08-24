import { z } from "zod";

export const RESULTADOS_POR_PAGINA = 12;

export const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(80, "Maximo 80 caracteres")
    .transform((s) => s.replace(/[%_,()]/g, " ").replace(/\s+/g, " "))
    .optional()
    .default(""),
  lat: z.coerce.number().min(-56).max(-17).optional(), // rango Chile continental
  lng: z.coerce.number().min(-76).max(-66).optional(),
  radioKm: z.coerce.number().int().min(1).max(150).default(25),
  page: z.coerce.number().int().min(1).max(50).default(1),
});

export type SearchInput = z.input<typeof searchSchema>;
export type SearchParams = z.output<typeof searchSchema>;

export function searchParamsToQueryString(p: Partial<SearchParams>): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.lat != null && p.lng != null) {
    sp.set("lat", p.lat.toFixed(5));
    sp.set("lng", p.lng.toFixed(5));
    sp.set("radioKm", String(p.radioKm ?? 25));
  }
  return sp.toString();
}
