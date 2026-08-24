import { z } from "zod";

/**
 * Vive aqui y no en el Server Action: un archivo "use server" solo puede
 * exportar funciones async, asi que las constantes y schemas van aparte.
 */
export const ESTADOS = ["guardado", "confirmado"] as const;
export type EstadoAsistencia = (typeof ESTADOS)[number];

export const marcarSchema = z.object({
  eventoId: z.string().uuid(),
  estado: z.enum(ESTADOS).nullable(), // null = quitar la marca
});
