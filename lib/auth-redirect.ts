/**
 * Solo se permiten rutas internas: "//evil.com" y "https://evil.com" son
 * redirecciones abiertas si se dejan pasar tal cual.
 */
export function rutaInternaSegura(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}
