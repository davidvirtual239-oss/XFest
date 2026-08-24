import "server-only";

/** Envio transaccional del ticket + QR via Brevo. */
export async function enviarTicket(p: {
  email: string;
  ordenId: string;
  montoClp: number;
  /** Nombre del evento cuando el cobro corresponde a una inscripcion. */
  evento?: string | null;
}) {
  const key = process.env.BREVO_API_KEY;
  if (!key) {
    console.warn("[brevo] sin API key, se omite el envio");
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      // OJO: el dominio del remitente debe estar verificado en Brevo antes de enviar.
      sender: { name: "XFest", email: "tickets@xfest.cl" },
      to: [{ email: p.email }],
      subject: p.evento ? `Tu ticket para ${p.evento}` : "Tu ticket de XFest",
      htmlContent: `${p.evento ? `<p>Tu inscripción a <b>${p.evento}</b> quedó confirmada.</p>` : ""}
                    <p>Pago confirmado por $${p.montoClp.toLocaleString("es-CL")} CLP.</p>
                    <p>Orden: <b>${p.ordenId}</b></p>`,
      tags: ["ticket"],
    }),
  });

  if (!res.ok) console.error("[brevo] fallo el envio", res.status, await res.text());
}
