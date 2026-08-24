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
import { AsistenciaBotones } from "@/components/site/asistencia-botones";
import { ValoracionForm } from "@/components/site/valoracion-form";
import { EstrellasLectura } from "@/components/ui/estrellas";
import { obtenerAsistencia, obtenerCupos } from "@/app/actions/asistencias";
import {
  miValoracion,
  puedeValorar,
  reputacionEvento,
} from "@/app/actions/valoraciones";
import { createClient } from "@/lib/supabase/server";

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
    <div className="flex items-start gap-3 rounded-2xl bg-ink-900 p-4 shadow-soft">
      <Icono className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden />
      <div className="min-w-0">
        <p className="text-[10px] tracking-brand text-cream-400 uppercase">{etiqueta}</p>
        <p className="mt-1 text-sm text-cream-50 first-letter:uppercase">{valor}</p>
      </div>
    </div>
  );
}

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await obtenerEvento(id);
  if (!evento) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Consultas independientes: en paralelo.
  const [asistencia, cupos, reputacion, valoracion, habilitado] = await Promise.all([
    obtenerAsistencia(evento.id),
    obtenerCupos(evento.id),
    reputacionEvento(evento.id),
    miValoracion(evento.id),
    puedeValorar(evento.id),
  ]);

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950 pb-20">
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
            {reputacion.total > 0 && (
              <div className="mt-3">
                <EstrellasLectura valor={reputacion.promedio} total={reputacion.total} size={16} />
              </div>
            )}
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
              valor={
                cupos.capacidad === null
                  ? "Sin límite"
                  : cupos.agotado
                    ? `Agotado · ${cupos.capacidad} personas`
                    : `${cupos.disponibles} de ${cupos.capacidad} disponibles`
              }
            />
          </div>

          <div className="mb-10 rounded-card border border-ink-800 bg-ink-900 p-6">
            <AsistenciaBotones
              eventoId={evento.id}
              inicial={asistencia}
              autenticado={Boolean(user)}
              cupos={cupos}
            />
          </div>

          {evento.descripcion && (
            <section className="animate-rise rounded-[var(--radius-card)] bg-ink-900 p-6 shadow-soft sm:p-10">
              <h2 className="font-display text-2xl text-cream-50">Sobre el evento</h2>
              <div className="rule-gold mt-4 h-px w-16" aria-hidden />
              <p className="mt-6 text-sm leading-relaxed whitespace-pre-line text-cream-200">
                {evento.descripcion}
              </p>
            </section>
          )}

          <section className="mt-10">
            <h2 className="font-display text-2xl text-cream-50">Dónde será</h2>
            <div className="rule-gold mt-4 h-px w-16" aria-hidden />
            {evento.direccion && (
              <p className="mt-6 flex items-start gap-2 text-sm text-cream-200">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                {evento.direccion}
              </p>
            )}
            <div className="mt-6">
              <MapaVista lat={evento.lat} lng={evento.lng} />
            </div>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl text-cream-50">Valoraciones</h2>
            <div className="rule-gold mt-4 h-px w-16" aria-hidden />

            <div className="mt-6">
              {habilitado || valoracion ? (
                <ValoracionForm eventoId={evento.id} actual={valoracion} />
              ) : (
                <p className="rounded-card border border-ink-800 bg-ink-900 p-8 text-center text-sm text-cream-400">
                  {!user
                    ? "Inicia sesión y confirma asistencia para poder valorar esta fiesta."
                    : user.id === evento.owner_id
                      ? "Esta fiesta es tuya: la valoran quienes asisten."
                      : "Podrás valorar esta fiesta cuando termine, si confirmaste asistencia."}
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
