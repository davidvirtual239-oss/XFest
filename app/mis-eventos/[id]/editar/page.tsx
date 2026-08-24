import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/site/top-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { EventoForm } from "@/components/site/evento-form";
import { obtenerEventoPropio } from "@/app/actions/eventos";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const evento = await obtenerEventoPropio(id);
  return { title: evento ? `Editar — ${evento.nombre}` : "Editar evento" };
}

export default async function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/mis-eventos/${id}/editar`);

  const evento = await obtenerEventoPropio(id);
  if (!evento) notFound();

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950">
        <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10 sm:py-14">
          <Link
            href={`/mis-eventos/${id}`}
            className="inline-flex items-center gap-2 text-xs tracking-brand text-cream-400 uppercase transition-colors hover:text-gold-400"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Volver al panel
          </Link>

          <header className="mt-8 mb-10 text-center">
            <p className="text-[10px] tracking-brand text-gold-400 uppercase">Editar evento</p>
            <h1 className="mt-3 font-display text-3xl text-cream-50 sm:text-4xl">
              {evento.nombre}
            </h1>
            <p className="mt-3 text-sm text-cream-400">
              Los cambios se ven de inmediato en la ficha pública.
            </p>
            <div className="rule-gold mx-auto mt-5 h-px w-24" aria-hidden />
          </header>

          <div className="animate-rise rounded-[var(--radius-card)] bg-ink-900 p-6 shadow-soft sm:p-10">
            <EventoForm evento={evento} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
