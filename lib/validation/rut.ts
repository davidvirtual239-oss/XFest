/**
 * RUT chileno: normalizacion, digito verificador (modulo 11) y formato.
 *
 * En base se guarda SIEMPRE normalizado ("12345678-5"): es lo unico que hace
 * comparable el indice unico (evento_id, rut). El formato con puntos es
 * decoracion de pantalla y no debe viajar a la base.
 */

/** Quita puntos, espacios y guiones; deja "123456785" con K mayuscula. */
function limpiar(valor: string): string {
  return valor.replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Digito verificador esperado para un cuerpo numerico, por modulo 11. */
export function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

/** "12.345.678-5" -> "12345678-5". Devuelve "" si no hay nada aprovechable. */
export function normalizarRut(valor: string): string {
  const plano = limpiar(valor);
  if (plano.length < 2) return "";
  return `${plano.slice(0, -1)}-${plano.slice(-1)}`;
}

export function rutValido(valor: string): boolean {
  const plano = limpiar(valor);
  // 7 digitos de cuerpo es el piso razonable para un RUT vigente.
  if (plano.length < 8 || plano.length > 9) return false;

  const cuerpo = plano.slice(0, -1);
  const dv = plano.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;   // la K solo puede ser el dv

  return digitoVerificador(cuerpo) === dv;
}

/** "12345678-5" -> "12.345.678-5", solo para mostrar. */
export function formatearRut(valor: string): string {
  const plano = limpiar(valor);
  if (plano.length < 2) return valor;

  const cuerpo = plano.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${plano.slice(-1)}`;
}
