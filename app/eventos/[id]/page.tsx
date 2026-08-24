import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/site/top-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { EventoDetalle } from "@/components/site/evento-detalle";
import { obtenerEvento } from "@/app/actions/eventos";
import { contarInscritos } from "@/app/actions/inscripciones";
import { fechaLarga } from "@/lib/formato-evento";

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

  const inscritos = await contarInscritos(id);

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950 pb-20">
        <EventoDetalle evento={evento} inscritos={inscritos} />
      </main>

      <SiteFooter />
    </>
  );
}
