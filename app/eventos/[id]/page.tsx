import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/site/top-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { EventoDetalle } from "@/components/site/evento-detalle";
import { AsistenciaBotones } from "@/components/site/asistencia-botones";
import { ValoracionForm } from "@/components/site/valoracion-form";
import { obtenerEvento } from "@/app/actions/eventos";
import { contarInscritos } from "@/app/actions/inscripciones";
import { obtenerAsistencia, contarAsistentes } from "@/app/actions/asistencias";
import { miValoracion, puedeValorar, reputacionEvento } from "@/app/actions/valoraciones";
import { fechaLarga } from "@/lib/formato-evento";
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

export default async function EventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await obtenerEvento(id);
  if (!evento) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Consultas independientes: en paralelo.
  const [inscritos, asistencia, asistentes, reputacion, valoracion, habilitado] =
    await Promise.all([
      contarInscritos(id),
      obtenerAsistencia(evento.id),
      contarAsistentes(evento.id),
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
        <EventoDetalle
          evento={evento}
          inscritos={inscritos}
          reputacion={reputacion}
          asistencia={
            <AsistenciaBotones
              eventoId={evento.id}
              inicial={asistencia}
              autenticado={Boolean(user)}
              confirmados={asistentes.confirmados}
            />
          }
          valoraciones={
            habilitado || valoracion ? (
              <ValoracionForm eventoId={evento.id} actual={valoracion} />
            ) : (
              <p className="rounded-card border border-ink-800 bg-ink-900 p-8 text-center text-sm text-cream-400">
                {!user
                  ? "Inicia sesión y confirma asistencia para poder valorar esta fiesta."
                  : user.id === evento.owner_id
                    ? "Esta fiesta es tuya: la valoran quienes asisten."
                    : "Podrás valorar esta fiesta cuando termine, si confirmaste asistencia."}
              </p>
            )
          }
        />
      </main>

      <SiteFooter />
    </>
  );
}
