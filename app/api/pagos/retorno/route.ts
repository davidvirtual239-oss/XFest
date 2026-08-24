import { NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/flow/client";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";       // node:crypto — no Edge
export const dynamic = "force-dynamic";

/**
 * Vuelta del navegador desde Flow (urlReturn).
 *
 * Esto SOLO navega: quien confirma el pago es el webhook servidor a servidor.
 * Por eso aca no se escribe nada en base — el token solo sirve para saber a
 * que inscripcion hay que llevar al usuario.
 */
export async function POST(req: Request) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  let token = "";
  try {
    const form = await req.formData();
    token = String(form.get("token") ?? "");
  } catch {
    // Flow tambien puede volver por GET con el token en la query.
    token = new URL(req.url).searchParams.get("token") ?? "";
  }

  if (!token || token.length > 128) {
    return NextResponse.redirect(`${base}/`, 303);
  }

  try {
    const status = await getPaymentStatus(token);

    const { data: inscripcion } = await createAdminClient()
      .from("inscripciones")
      .select("id, evento_id")
      .eq("id", status.commerceOrder)
      .maybeSingle();

    if (!inscripcion) return NextResponse.redirect(`${base}/`, 303);

    return NextResponse.redirect(
      `${base}/eventos/${inscripcion.evento_id}/inscripcion?ref=${inscripcion.id}`,
      303
    );
  } catch (e) {
    console.error("[flow] retorno fallido", e);
    return NextResponse.redirect(`${base}/`, 303);
  }
}

export const GET = POST;
