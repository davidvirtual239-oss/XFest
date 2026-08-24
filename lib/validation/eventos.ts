import { z } from "zod";

export const MAX_PORTADA_BYTES = 8 * 1024 * 1024;
export const PORTADA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy en la zona del servidor, en formato YYYY-MM-DD (comparable como string). */
export function hoyISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

export const eventoSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(3, "Minimo 3 caracteres")
      .max(100, "Maximo 100 caracteres"),
    descripcion: z.string().trim().max(2000, "Maximo 2000 caracteres").optional().default(""),
    fecha: z
      .string()
      .regex(FECHA_RE, "Fecha invalida")
      .refine((f) => f >= hoyISO(), "La fecha no puede ser en el pasado"),
    horaInicio: z.string().regex(HORA_RE, "Hora invalida"),
    horaTermino: z.string().regex(HORA_RE, "Hora invalida"),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    direccion: z.string().trim().max(200).optional().default(""),
    sinLimiteCapacidad: z.preprocess((v) => v === "on" || v === "true", z.boolean()).default(false),
    capacidad: z.coerce.number().int().positive().max(100000).optional(),
    precioClp: z.coerce
      .number({ invalid_type_error: "Indica un precio" })
      .int("Solo numeros enteros")
      .min(0, "El precio no puede ser negativo")
      .max(50_000_000, "Precio demasiado alto"),
  })
  .refine((d) => d.horaTermino > d.horaInicio, {
    path: ["horaTermino"],
    message: "El termino debe ser despues del inicio",
  })
  .superRefine((d, ctx) => {
    if (!d.sinLimiteCapacidad && d.capacidad == null) {
      ctx.addIssue({
        path: ["capacidad"],
        code: z.ZodIssueCode.custom,
        message: "Indica un numero o marca 'sin limite'",
      });
    }
  });

export type EventoInput = z.input<typeof eventoSchema>;
export type EventoParams = z.output<typeof eventoSchema>;

/** El File no pasa por Zod: se valida aparte antes de tocar Storage. */
export function validarPortada(file: unknown): { file: File } | { error: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Sube una foto principal para el evento." };
  }
  if (!PORTADA_MIME_TYPES.includes(file.type as (typeof PORTADA_MIME_TYPES)[number])) {
    return { error: "Formato no permitido. Usa JPG, PNG o WEBP." };
  }
  if (file.size > MAX_PORTADA_BYTES) {
    return { error: "La foto supera los 8 MB." };
  }
  return { file };
}

export function extensionDePortada(mime: string): string {
  return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
}
