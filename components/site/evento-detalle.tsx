import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Clock, MapPin, Users, Ticket } from "lucide-react";
import { MapaVista } from "@/components/site/mapa";
import { GaleriaEvento } from "@/components/site/galeria-evento";
import { Button } from "@/components/ui/button";
import { EstrellasLectura } from "@/components/ui/estrellas";
import type { Evento } from "@/app/actions/eventos";
import type { Conteo } from "@/app/actions/inscripciones";
import type { Reputacion } from "@/app/actions/valoraciones";
import { fechaLarga, horario } from "@/lib/formato-evento";
import { hoyISO } from "@/lib/validation/eventos";
import { CLP } from "@/lib/utils";

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

/**
 * Ficha publica del evento. La reusa el organizador desde su panel para ver
 * exactamente lo que ve el resto; ahi `previsualizacion` apaga el CTA, que
 * en su caso no lleva a ninguna parte.
 *
 * Lo que depende de quien mira (asistencia, valoraciones) entra por slots en
 * vez de resolverse aca dentro: asi la vista previa del organizador queda
 * estatica sin duplicar el layout.
 */
export function EventoDetalle({
  evento,
  conteo,
  previsualizacion = false,
  reputacion,
  asistencia,
  valoraciones,
}: {
  evento: Evento;
  conteo: Conteo;
  previsualizacion?: boolean;
  reputacion?: Reputacion;
  asistencia?: React.ReactNode;
  valoraciones?: React.ReactNode;
}) {
  // Vale la fecha de TERMINO: una fiesta de 22:00 a 04:00 sigue viva de madrugada.
  const termino = evento.fecha_termino < hoyISO();
  // Los cupos los descuenta quien tomo lugar, incluso si aun debe pagar.
  const disponibles = evento.capacidad != null ? evento.capacidad - conteo.inscritos : null;
  const agotado = disponibles != null && disponibles <= 0;

  return (
    <>
      <section className="relative isolate h-[clamp(18rem,44vh,26rem)] overflow-hidden">
        <Image
          src={evento.portada_url}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/85 via-ink-950/45 to-ink-950/20"
          aria-hidden
        />

        <div className="mx-auto flex h-full max-w-5xl flex-col justify-end px-6 pb-10 sm:px-10">
          <p className="text-[10px] tracking-brand text-gold-300 uppercase">
            {fechaLarga(evento.fecha)}
          </p>
          <h1 className="mt-3 max-w-3xl text-balance-title font-display text-3xl leading-tight text-cream-50 sm:text-5xl">
            {evento.nombre}
          </h1>
          {reputacion && reputacion.total > 0 && (
            <div className="mt-3">
              <EstrellasLectura valor={reputacion.promedio} total={reputacion.total} size={16} />
            </div>
          )}
        </div>
      </section>

      <div className="rule-gold h-px w-full" aria-hidden />

      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <div className="grid gap-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <Dato icono={CalendarDays} etiqueta="Fecha" valor={fechaLarga(evento.fecha)} />
          <Dato
            icono={Clock}
            etiqueta="Horario"
            valor={horario(evento.fecha, evento.hora_inicio, evento.fecha_termino, evento.hora_termino)}
          />
          <Dato
            icono={Ticket}
            etiqueta="Precio"
            valor={evento.precio_clp === 0 ? "Gratis" : CLP.format(evento.precio_clp)}
          />
          <Dato
            icono={Users}
            etiqueta="Cupos"
            valor={
              disponibles != null
                ? `${Math.max(disponibles, 0)} de ${evento.capacidad} disponibles`
                : "Sin límite"
            }
          />
        </div>

        {/* Barra de inscripcion: el unico dorado solido de la pagina, y la que
            lleva el conteo real de asistentes. La asistencia de mas abajo es
            solo una senal de interes y no cuenta cabezas. */}
        <section className="flex flex-col items-center justify-between gap-5 rounded-[var(--radius-card)] bg-ink-900 p-6 shadow-soft sm:flex-row sm:p-8">
          <div className="text-center sm:text-left">
            <p className="font-display text-xl text-cream-50">
              {termino
                ? "Este evento ya pasó"
                : agotado
                  ? "Cupos agotados"
                  : evento.precio_clp === 0
                    ? "Entrada liberada"
                    : `Entrada ${CLP.format(evento.precio_clp)} por persona`}
            </p>
            <p className="mt-1.5 text-sm text-cream-400">
              {conteo.confirmados > 0 ? (
                <>
                  <b className="text-cream-100">
                    {conteo.confirmados}{" "}
                    {conteo.confirmados === 1 ? "persona inscrita" : "personas inscritas"}
                  </b>
                  {!termino && !agotado && " · Reserva tu lugar en menos de un minuto."}
                </>
              ) : termino ? (
                "Nadie se inscribió."
              ) : (
                "Sé la primera persona en inscribirse."
              )}
            </p>
          </div>

          {previsualizacion ? (
            <Button size="lg" disabled>
              Inscribirme
            </Button>
          ) : (
            <Button size="lg" asChild={!termino && !agotado} disabled={termino || agotado}>
              {termino || agotado ? (
                <span>Inscripciones cerradas</span>
              ) : (
                <Link href={`/eventos/${evento.id}/inscribirse`}>Inscribirme</Link>
              )}
            </Button>
          )}
        </section>

        {asistencia && (
          <div className="mt-4 rounded-card border border-ink-800 bg-ink-900/60 p-6">
            {asistencia}
          </div>
        )}

        {evento.descripcion && (
          <section className="animate-rise mt-10 rounded-[var(--radius-card)] bg-ink-900 p-6 shadow-soft sm:p-10">
            <h2 className="font-display text-2xl text-cream-50">Sobre el evento</h2>
            <div className="rule-gold mt-4 h-px w-16" aria-hidden />
            <p className="mt-6 text-sm leading-relaxed whitespace-pre-line text-cream-200">
              {evento.descripcion}
            </p>
          </section>
        )}

        {evento.galeria_urls.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-2xl text-cream-50">Galería</h2>
            <div className="rule-gold mt-4 h-px w-16" aria-hidden />
            <div className="mt-6">
              <GaleriaEvento fotos={evento.galeria_urls} nombre={evento.nombre} />
            </div>
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

        {valoraciones && (
          <section className="mt-14">
            <h2 className="font-display text-2xl text-cream-50">Valoraciones</h2>
            <div className="rule-gold mt-4 h-px w-16" aria-hidden />
            <div className="mt-6">{valoraciones}</div>
          </section>
        )}
      </div>
    </>
  );
}
