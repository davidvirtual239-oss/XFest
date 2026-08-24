import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Ticket, Users, ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/site/top-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { InscripcionForm } from "@/components/site/inscripcion-form";
import { Button } from "@/components/ui/button";
import { obtenerEvento } from "@/app/actions/eventos";
import { contarInscritos, datosPrellenados } from "@/app/actions/inscripciones";
import { fechaLarga, horario } from "@/lib/formato-evento";
import { hoyISO } from "@/lib/validation/eventos";
import { CLP } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const evento = await obtenerEvento(id);
  return { title: evento ? `Inscribirme — ${evento.nombre}` : "Inscripción" };
}

function Aviso({ titulo, texto, eventoId }: { titulo: string; texto: string; eventoId: string }) {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-ink-900 p-10 text-center shadow-soft">
      <p className="font-display text-xl text-cream-50">{titulo}</p>
      <p className="mt-3 text-sm text-cream-400">{texto}</p>
      <Button variant="outline" size="sm" asChild className="mt-6">
        <Link href={`/eventos/${eventoId}`}>Volver al evento</Link>
      </Button>
    </div>
  );
}

export default async function InscribirsePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await obtenerEvento(id);
  if (!evento) notFound();

  const [conteo, datos] = await Promise.all([contarInscritos(id), datosPrellenados()]);

  const termino = evento.fecha_termino < hoyISO();
  const agotado = evento.capacidad != null && conteo.inscritos >= evento.capacidad;
  const disponibles = evento.capacidad != null ? evento.capacidad - conteo.inscritos : null;

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950 pb-20">
        <div className="mx-auto max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
          <Link
            href={`/eventos/${id}`}
            className="inline-flex items-center gap-2 text-xs tracking-brand text-cream-400 uppercase transition-colors hover:text-gold-400"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Volver al evento
          </Link>

          <header className="mt-8 mb-10 text-center">
            <p className="text-[10px] tracking-brand text-gold-400 uppercase">Inscripción</p>
            <h1 className="mt-3 font-display text-3xl text-cream-50 sm:text-4xl">
              {evento.nombre}
            </h1>
            <div className="rule-gold mx-auto mt-5 h-px w-24" aria-hidden />
          </header>

          {termino ? (
            <Aviso
              titulo="Este evento ya pasó"
              texto="Las inscripciones están cerradas."
              eventoId={id}
            />
          ) : agotado ? (
            <Aviso
              titulo="Cupos agotados"
              texto="Ya no quedan lugares disponibles para este evento."
              eventoId={id}
            />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
              <div className="animate-rise order-2 rounded-[var(--radius-card)] bg-ink-900 p-6 shadow-soft sm:p-8 lg:order-1">
                <h2 className="font-display text-xl text-cream-50">Tus datos</h2>
                <p className="mt-2 mb-6 text-sm text-cream-400">
                  Los necesitamos para registrarte en la lista de asistentes.
                </p>
                <InscripcionForm
                  eventoId={id}
                  precioClp={evento.precio_clp}
                  datos={datos}
                  haySesion={Boolean(datos.email)}
                />
              </div>

              {/* Resumen: recuerda a qué se está inscribiendo sin volver atrás. */}
              <aside className="order-1 overflow-hidden rounded-[var(--radius-card)] bg-ink-900 shadow-soft lg:order-2 lg:sticky lg:top-24">
                <div className="relative aspect-16/9">
                  <Image
                    src={evento.portada_url}
                    alt=""
                    fill
                    sizes="(min-width:1024px) 20rem, 100vw"
                    className="object-cover"
                  />
                </div>
                <dl className="space-y-3 p-5 text-sm">
                  <div className="flex items-start gap-2.5 text-cream-200">
                    <CalendarDays className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                    <span className="first-letter:uppercase">{fechaLarga(evento.fecha)}</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-cream-200">
                    <Clock className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                    {horario(evento.fecha, evento.hora_inicio, evento.fecha_termino, evento.hora_termino)}
                  </div>
                  {evento.direccion && (
                    <div className="flex items-start gap-2.5 text-cream-200">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                      {evento.direccion}
                    </div>
                  )}
                  <div className="flex items-start gap-2.5 text-cream-200">
                    <Users className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                    {disponibles != null
                      ? `${disponibles} ${disponibles === 1 ? "cupo disponible" : "cupos disponibles"}`
                      : "Sin límite de cupos"}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-ink-800 pt-4">
                    <span className="flex items-center gap-2.5 text-cream-400">
                      <Ticket className="size-4 shrink-0 text-gold-600" aria-hidden />
                      Total
                    </span>
                    <span className="font-display text-lg text-cream-50">
                      {evento.precio_clp === 0 ? "Gratis" : CLP.format(evento.precio_clp)}
                    </span>
                  </div>
                </dl>
              </aside>
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
