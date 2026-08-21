const FECHA_LARGA = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const FECHA_CORTA = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** La columna es `date` (sin zona): se formatea en UTC para no correr un dia. */
export function fechaLarga(fecha: string): string {
  return FECHA_LARGA.format(new Date(`${fecha}T00:00:00Z`));
}

export function fechaCorta(fecha: string): string {
  return FECHA_CORTA.format(new Date(`${fecha}T00:00:00Z`));
}

/** Postgres devuelve `time` como "HH:MM:SS". */
export function hora(valor: string): string {
  return valor.slice(0, 5);
}
