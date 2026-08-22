import "server-only";

/** Envio transaccional del ticket + QR via Brevo. */
export async function enviarTicket(p: {
  email: string;
  ordenId: string;
  montoClp: number;
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
      sender: { name: "XFest", email: "tickets@fiestamaestra.cl" },
      to: [{ email: p.email }],
      subject: "Tu ticket de XFest",
      htmlContent: `<p>Pago confirmado por $${p.montoClp.toLocaleString("es-CL")} CLP.</p>
                    <p>Orden: <b>${p.ordenId}</b></p>`,
      tags: ["ticket"],
    }),
  });

  if (!res.ok) console.error("[brevo] fallo el envio", res.status, await res.text());
}
