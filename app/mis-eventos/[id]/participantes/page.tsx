import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/site/top-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { ListaParticipantes } from "@/components/site/lista-participantes";
import { obtenerEventoPropio } from "@/app/actions/eventos";
import { listarParticipantes } from "@/app/actions/inscripciones";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const evento = await obtenerEventoPropio(id);
  return { title: evento ? `Participantes — ${evento.nombre}` : "Participantes" };
}

// La lista cambia con cada inscripcion: nunca se sirve cacheada.
export const dynamic = "force-dynamic";

export default async function ParticipantesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/mis-eventos/${id}/participantes`);

  const evento = await obtenerEventoPropio(id);
  if (!evento) notFound();

  const participantes = await listarParticipantes(id);
  const confirmados = participantes.filter((p) => p.estado === "confirmada").length;

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950 pb-20">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
          <Link
            href={`/mis-eventos/${id}`}
            className="inline-flex items-center gap-2 text-xs tracking-brand text-cream-400 uppercase transition-colors hover:text-gold-400"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Volver al panel
          </Link>

          <header className="mt-8 mb-10 text-center">
            <p className="text-[10px] tracking-brand text-gold-400 uppercase">Participantes</p>
            <h1 className="mt-3 font-display text-3xl text-cream-50 sm:text-4xl">
              {evento.nombre}
            </h1>
            <p className="mt-3 text-sm text-cream-400">
              {confirmados}{" "}
              {confirmados === 1 ? "inscripción confirmada" : "inscripciones confirmadas"}
              {evento.capacidad != null && ` de ${evento.capacidad} cupos`}
            </p>
            <div className="rule-gold mx-auto mt-5 h-px w-24" aria-hidden />
          </header>

          <ListaParticipantes participantes={participantes} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
