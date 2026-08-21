import { NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/flow/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarTicket } from "@/lib/brevo";

export const runtime = "nodejs";       // node:crypto — no Edge
export const dynamic = "force-dynamic";

const ESTADOS = { 1: "pendiente", 2: "pagada", 3: "rechazada", 4: "anulada" } as const;

/**
 * Webhook de confirmacion de Flow.cl (urlConfirmation).
 *
 * Reglas de oro:
 *  1. El body SOLO trae un `token`. Nunca confiar en montos/estados del POST.
 *  2. Se re-consulta getStatus() con firma HMAC -> fuente de verdad.
 *  3. Idempotencia por PK sobre `token` en flow_eventos (Flow reintenta).
 *  4. Responder 200 rapido: un 4xx/5xx dispara reintentos innecesarios.
 */
export async function POST(req: Request) {
  let token: string | null = null;

  try {
    const form = await req.formData();
    token = String(form.get("token") ?? "");
  } catch {
    return NextResponse.json({ error: "body invalido" }, { status: 400 });
  }

  if (!token || token.length > 128) {
    return NextResponse.json({ error: "token invalido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // (3) Idempotencia: si el token ya existe, este webhook ya se proceso.
  const { error: dupError } = await supabase
    .from("flow_eventos")
    .insert({ token, payload: { recibido_en: new Date().toISOString() } });

  if (dupError) {
    if (dupError.code === "23505") return NextResponse.json({ ok: true, duplicado: true });
    console.error("[flow] log fallido", dupError);
    return NextResponse.json({ error: "db" }, { status: 500 });
  }

  try {
    // (2) Fuente de verdad: consulta firmada a Flow.
    const status = await getPaymentStatus(token);
    const nuevoEstado = ESTADOS[status.status];

    const { data: orden, error } = await supabase
      .from("ordenes")
      .update({
        estado: nuevoEstado,
        flow_order: status.flowOrder,
        pagado_en: status.status === 2 ? new Date().toISOString() : null,
      })
      .eq("commerce_order", status.commerceOrder)
      .eq("monto_clp", Number(status.amount))     // el monto debe calzar con el nuestro
      .in("estado", ["pendiente"])                // no re-procesar una orden cerrada
      .select("id, email, monto_clp")
      .maybeSingle();

    if (error) throw error;

    if (!orden) {
      // Monto adulterado, orden inexistente o ya cerrada: se registra, no se falla.
      console.warn("[flow] sin orden coincidente", status.commerceOrder);
      return NextResponse.json({ ok: true, sin_cambios: true });
    }

    if (nuevoEstado === "pagada") {
      await enviarTicket({
        email: orden.email,
        ordenId: orden.id,
        montoClp: orden.monto_clp,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    // Se libera el token para permitir el reintento de Flow.
    await supabase.from("flow_eventos").delete().eq("token", token);
    console.error("[flow] error procesando", e);
    return NextResponse.json({ error: "procesamiento" }, { status: 500 });
  }
}

// Flow solo usa POST; cerrar el resto evita sondeos.
export function GET() {
  return new NextResponse(null, { status: 405 });
}
