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

type FlowPagoCreado = { token: string; url: string; flowOrder: number };

/**
 * Crea el cobro en Flow y devuelve la URL a la que hay que mandar al pagador.
 *
 * `urlConfirmation` es la unica fuente de verdad del pago (webhook servidor a
 * servidor); `urlReturn` solo trae de vuelta al navegador y por eso nunca
 * decide si la inscripcion queda confirmada.
 */
export async function crearPago(p: {
  commerceOrder: string;
  subject: string;
  amountClp: number;
  email: string;
}): Promise<{ redirectUrl: string; flowOrder: number }> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const res = await flowPost<FlowPagoCreado>("/payment/create", {
    commerceOrder: p.commerceOrder,
    subject: p.subject.slice(0, 120),
    currency: "CLP",
    amount: p.amountClp,
    email: p.email,
    urlConfirmation: `${base}/api/webhooks/flow`,
    urlReturn: `${base}/api/pagos/retorno`,
  });

  return { redirectUrl: `${res.url}?token=${res.token}`, flowOrder: res.flowOrder };
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
