import { z } from "zod";

export const MAX_PORTADA_BYTES = 8 * 1024 * 1024;
export const PORTADA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Entrada pagada mas barata. Debajo de esto, la comision se come el ticket. */
export const PRECIO_MINIMO_CLP = 1000;

export const MAX_FOTOS_GALERIA = 6;
/** Tope de dias que puede durar un evento; ataja el dedazo en el date picker. */
export const MAX_DIAS_EVENTO = 3;

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha de hoy en la zona del servidor, en formato YYYY-MM-DD (comparable como string). */
export function hoyISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Dias enteros entre dos fechas YYYY-MM-DD. */
function diasEntre(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
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
    fechaTermino: z.string().regex(FECHA_RE, "Fecha invalida"),
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
  // El termino se compara como (fecha, hora) y no solo por hora: asi una
  // fiesta de 22:00 a 04:00 del dia siguiente es valida.
  .superRefine((d, ctx) => {
    if (d.fechaTermino < d.fecha) {
      ctx.addIssue({
        path: ["fechaTermino"],
        code: z.ZodIssueCode.custom,
        message: "No puede terminar antes de empezar",
      });
      return;
    }

    if (d.fechaTermino === d.fecha && d.horaTermino <= d.horaInicio) {
      ctx.addIssue({
        path: ["horaTermino"],
        code: z.ZodIssueCode.custom,
        message: "Si termina el mismo dia, debe ser despues del inicio",
      });
    }

    if (diasEntre(d.fecha, d.fechaTermino) > MAX_DIAS_EVENTO) {
      ctx.addIssue({
        path: ["fechaTermino"],
        code: z.ZodIssueCode.custom,
        message: `Un evento no puede durar mas de ${MAX_DIAS_EVENTO} dias`,
      });
    }
  })
  .superRefine((d, ctx) => {
    if (!d.sinLimiteCapacidad && d.capacidad == null) {
      ctx.addIssue({
        path: ["capacidad"],
        code: z.ZodIssueCode.custom,
        message: "Indica un numero o marca 'sin limite'",
      });
    }
  })
  .superRefine((d, ctx) => {
    // 0 es gratis; cualquier cobro arranca en el minimo.
    if (d.precioClp > 0 && d.precioClp < PRECIO_MINIMO_CLP) {
      ctx.addIssue({
        path: ["precioClp"],
        code: z.ZodIssueCode.custom,
        message: `Deja 0 si es gratis, o cobra al menos $${PRECIO_MINIMO_CLP.toLocaleString("es-CL")}`,
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

/**
 * Fotos secundarias. Devuelve la lista vacia si no mandaron ninguna: la
 * galeria es opcional, no es un error que falte.
 */
export function validarGaleria(
  archivos: unknown[],
  yaGuardadas = 0
): { files: File[] } | { error: string } {
  const files = archivos.filter(
    (f): f is File => f instanceof File && f.size > 0
  );

  if (files.length + yaGuardadas > MAX_FOTOS_GALERIA) {
    return { error: `Puedes tener hasta ${MAX_FOTOS_GALERIA} fotos secundarias.` };
  }

  for (const file of files) {
    if (!PORTADA_MIME_TYPES.includes(file.type as (typeof PORTADA_MIME_TYPES)[number])) {
      return { error: `"${file.name}": formato no permitido. Usa JPG, PNG o WEBP.` };
    }
    if (file.size > MAX_PORTADA_BYTES) {
      return { error: `"${file.name}" supera los 8 MB.` };
    }
  }

  return { files };
}

export function extensionDePortada(mime: string): string {
  return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
}
