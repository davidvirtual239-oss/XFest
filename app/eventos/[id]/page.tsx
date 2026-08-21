import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Users, Ticket } from "lucide-react";
import { TopBar } from "@/components/site/top-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { MapaVista } from "@/components/site/mapa";
import { obtenerEvento } from "@/app/actions/eventos";
import { fechaLarga, hora } from "@/lib/formato-evento";
import { CLP } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const evento = await obtenerEvento(id);
  if (!evento) return { title: "Evento no encontrado" };

  return {
    title: evento.nombre,
    description: evento.descripcion?.slice(0, 160) ?? `Evento el ${fechaLarga(evento.fecha)}.`,
    openGraph: { images: [evento.portada_url] },
  };
}

function Dato({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: typeof CalendarDays;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-soft">
      <Icono className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] tracking-brand text-ink-500 uppercase">{etiqueta}</p>
        <p className="mt-1 text-sm text-ink-900 first-letter:uppercase">{valor}</p>
      </div>
    </div>
  );
}

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await obtenerEvento(id);
  if (!evento) notFound();

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-cream-200 bg-cream-50" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-cream-100 pb-20">
        <section className="relative isolate h-[clamp(18rem,44vh,26rem)] overflow-hidden">
          <Image
            src={evento.portada_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/85 via-ink-950/45 to-ink-950/20" aria-hidden />

          <div className="mx-auto flex h-full max-w-5xl flex-col justify-end px-6 pb-10 sm:px-10">
            <p className="text-[10px] tracking-brand text-gold-300 uppercase">
              {fechaLarga(evento.fecha)}
            </p>
            <h1 className="mt-3 max-w-3xl text-balance-title font-display text-3xl leading-tight text-cream-50 sm:text-5xl">
              {evento.nombre}
            </h1>
          </div>
        </section>

        <div className="rule-gold h-px w-full" aria-hidden />

        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          <div className="-mt-0 grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
            <Dato icono={CalendarDays} etiqueta="Fecha" valor={fechaLarga(evento.fecha)} />
            <Dato
              icono={Clock}
              etiqueta="Horario"
              valor={`${hora(evento.hora_inicio)} a ${hora(evento.hora_termino)} h`}
            />
            <Dato icono={Ticket} etiqueta="Precio" valor={evento.precio_clp === 0 ? "Gratis" : CLP.format(evento.precio_clp)} />
            <Dato
              icono={Users}
              etiqueta="Cupos"
              valor={evento.capacidad ? `${evento.capacidad} personas` : "Sin límite"}
            />
          </div>

          {evento.descripcion && (
            <section className="animate-rise rounded-[var(--radius-card)] bg-white p-6 shadow-soft sm:p-10">
              <h2 className="font-display text-2xl text-ink-900">Sobre el evento</h2>
              <div className="rule-gold mt-4 h-px w-16" aria-hidden />
              <p className="mt-6 text-sm leading-relaxed whitespace-pre-line text-ink-700">
                {evento.descripcion}
              </p>
            </section>
          )}

          <section className="mt-10">
            <h2 className="font-display text-2xl text-ink-900">Dónde será</h2>
            <div className="rule-gold mt-4 h-px w-16" aria-hidden />
            {evento.direccion && (
              <p className="mt-6 flex items-start gap-2 text-sm text-ink-700">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                {evento.direccion}
              </p>
            )}
            <div className="mt-6">
              <MapaVista lat={evento.lat} lng={evento.lng} />
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
