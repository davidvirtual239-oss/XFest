import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { TopBar } from "@/components/site/top-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { obtenerEvento } from "@/app/actions/eventos";
import { obtenerInscripcion } from "@/app/actions/inscripciones";
import { fechaLarga, hora } from "@/lib/formato-evento";

export const metadata: Metadata = { title: "Inscripción" };
// El estado lo mueve el webhook de Flow: esta pantalla nunca se cachea.
export const dynamic = "force-dynamic";

const SEGUN_ESTADO = {
  confirmada: {
    icono: CheckCircle2,
    color: "text-emerald-400",
    titulo: "¡Listo, ya estás inscrito!",
    texto: "Te enviamos la confirmación a tu correo. Nos vemos en el evento.",
  },
  pendiente: {
    icono: Clock3,
    color: "text-gold-400",
    titulo: "Estamos confirmando tu pago",
    texto:
      "Tu cupo quedó reservado. Apenas Flow nos confirme el pago te llega la entrada por correo.",
  },
  cancelada: {
    icono: XCircle,
    color: "text-red-400",
    titulo: "No pudimos completar tu inscripción",
    texto: "El pago no se concretó y liberamos el cupo. Puedes intentarlo de nuevo.",
  },
} as const;

export default async function ConfirmacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const [{ id }, { ref }] = await Promise.all([params, searchParams]);
  if (!ref) notFound();

  const [evento, inscripcion] = await Promise.all([obtenerEvento(id), obtenerInscripcion(ref)]);
  if (!evento || !inscripcion) notFound();

  const vista = SEGUN_ESTADO[inscripcion.estado];
  const Icono = vista.icono;

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950 pb-20">
        <div className="mx-auto max-w-xl px-6 py-16 sm:px-10 sm:py-24">
          <div className="animate-rise rounded-[var(--radius-card)] bg-ink-900 p-8 text-center shadow-soft sm:p-12">
            <Icono className={`mx-auto size-12 ${vista.color}`} aria-hidden />

            <h1 className="mt-6 font-display text-2xl text-cream-50 sm:text-3xl">
              {vista.titulo}
            </h1>
            <p className="mt-3 text-sm text-cream-400">{vista.texto}</p>

            <div className="rule-gold mx-auto my-8 h-px w-24" aria-hidden />

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-cream-400">Evento</dt>
                <dd className="text-right text-cream-50">{evento.nombre}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-cream-400">Cuándo</dt>
                <dd className="text-right text-cream-50 first-letter:uppercase">
                  {fechaLarga(evento.fecha)} · {hora(evento.hora_inicio)} h
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-cream-400">A nombre de</dt>
                <dd className="text-right text-cream-50">{inscripcion.nombre}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-cream-400">Correo</dt>
                <dd className="text-right break-all text-cream-50">{inscripcion.email}</dd>
              </div>
            </dl>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {inscripcion.estado === "pendiente" && (
                <Button size="sm" asChild>
                  <Link href={`/eventos/${id}/inscripcion?ref=${ref}`}>Actualizar estado</Link>
                </Button>
              )}
              {inscripcion.estado === "cancelada" && (
                <Button size="sm" asChild>
                  <Link href={`/eventos/${id}/inscribirse`}>Intentar de nuevo</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/eventos/${id}`}>Ver el evento</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
