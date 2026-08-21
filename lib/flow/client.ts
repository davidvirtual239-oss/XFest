import "server-only";
import crypto from "node:crypto";

const API = process.env.FLOW_API_URL ?? "https://sandbox.flow.cl/api";

/**
 * Flow firma con HMAC-SHA256 sobre los parametros concatenados
 * en orden alfabetico de clave: nombre + valor, sin separadores.
 */
export function firmarParams(params: Record<string, string | number>): string {
  const secret = process.env.FLOW_SECRET_KEY;
  if (!secret) throw new Error("FLOW_SECRET_KEY no configurada");

  const cadena = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");

  return crypto.createHmac("sha256", secret).update(cadena).digest("hex");
}

/** Comparacion en tiempo constante: evita timing attacks sobre la firma. */
export function firmaValida(esperada: string, recibida: string): boolean {
  const a = Buffer.from(esperada, "utf8");
  const b = Buffer.from(recibida, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** POST firmado a la API de Flow (create, getStatus, etc.). */
export async function flowPost<T>(
  endpoint: string,
  params: Record<string, string | number>
): Promise<T> {
  const body = { apiKey: process.env.FLOW_API_KEY!, ...params };
  const payload = new URLSearchParams({
    ...Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])),
    s: firmarParams(body),
  });

  const res = await fetch(`${API}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Flow ${endpoint} -> ${res.status}`);
  return (await res.json()) as T;
}

export type FlowStatus = {
  flowOrder: number;
  commerceOrder: string;
  status: 1 | 2 | 3 | 4; // 1 pendiente, 2 pagada, 3 rechazada, 4 anulada
  amount: string;
  payer: string;
};

/** GET firmado de estado de pago: la unica fuente de verdad del cobro. */
export async function getPaymentStatus(token: string): Promise<FlowStatus> {
  const params = { apiKey: process.env.FLOW_API_KEY!, token };
  const qs = new URLSearchParams({ ...params, s: firmarParams(params) });

  const res = await fetch(`${API}/payment/getStatus?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Flow getStatus -> ${res.status}`);
  return (await res.json()) as FlowStatus;
}
