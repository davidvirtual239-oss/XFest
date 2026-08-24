import { z } from "zod";
import { normalizarRut, rutValido } from "@/lib/validation/rut";

/**
 * Celular chileno. Se acepta como venga (+56 9 1234 5678, 912345678,
 * 9 1234 5678) y se guarda normalizado a "+569XXXXXXXX".
 */
export function normalizarTelefono(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  const sinPais = digitos.startsWith("56") ? digitos.slice(2) : digitos;
  const celular = sinPais.startsWith("0") ? sinPais.slice(1) : sinPais;
  return celular.length === 9 ? `+56${celular}` : "";
}

export const inscripcionSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "Minimo 2 caracteres")
    .max(80, "Maximo 80 caracteres"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Correo invalido")
    .max(120, "Correo demasiado largo"),
  telefono: z
    .string()
    .transform(normalizarTelefono)
    .refine((t) => t !== "", "Celular invalido. Ej: +56 9 1234 5678"),
  rut: z
    .string()
    .refine(rutValido, "RUT invalido. Revisa el digito verificador")
    .transform(normalizarRut),
});

export type InscripcionParams = z.output<typeof inscripcionSchema>;
