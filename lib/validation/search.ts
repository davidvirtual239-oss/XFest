import { z } from "zod";

export const CATEGORIAS = [
  "infantiles",
  "corporativos",
  "bodas",
  "graduaciones",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

/**
 * Fuente unica de verdad del buscador.
 * Se usa en (1) el Server Action, (2) el parseo de searchParams en /buscar
 * y (3) opcionalmente en el cliente para feedback inmediato.
 */
export const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(80, "Maximo 80 caracteres")
    .transform((s) => s.replace(/[%_,()]/g, " ").replace(/\s+/g, " "))
    .optional()
    .default(""),
  categoria: z.enum(CATEGORIAS).optional(),
  // Geoubicacion: se completa desde el navegador o desde una comuna elegida
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
  if (p.categoria) sp.set("categoria", p.categoria);
  if (p.lat != null && p.lng != null) {
    sp.set("lat", p.lat.toFixed(5));
    sp.set("lng", p.lng.toFixed(5));
    sp.set("radioKm", String(p.radioKm ?? 25));
  }
  return sp.toString();
}
