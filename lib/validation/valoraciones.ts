import { z } from "zod";

/** Fuera del Server Action: "use server" solo exporta funciones async. */
export const valoracionSchema = z.object({
  eventoId: z.string().uuid(),
  estrellasEvento: z.coerce.number().int().min(1, "Elige de 1 a 5").max(5),
  estrellasOrganizador: z.coerce.number().int().min(1, "Elige de 1 a 5").max(5),
  comentario: z.string().trim().max(500, "Máximo 500 caracteres").optional().default(""),
});
