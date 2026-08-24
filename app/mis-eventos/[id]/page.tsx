import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, Pencil, Users } from "lucide-react";
import { TopBar } from "@/components/site/top-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { EventoDetalle } from "@/components/site/evento-detalle";
import { EliminarEventoModal } from "@/components/site/eliminar-evento-modal";
import { Button } from "@/components/ui/button";
import { obtenerEventoPropio } from "@/app/actions/eventos";
import { contarInscritos } from "@/app/actions/inscripciones";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const evento = await obtenerEventoPropio(id);
  return { title: evento ? `Administrar — ${evento.nombre}` : "Mis eventos" };
}

export default async function AdministrarEventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const [{ id }, { guardado }] = await Promise.all([params, searchParams]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/mis-eventos/${id}`);

  const evento = await obtenerEventoPropio(id);
  if (!evento) notFound();

  const inscritos = await contarInscritos(id);

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950 pb-20">
        {/* Barra del organizador: lo unico que el publico no ve de esta pagina. */}
        <div className="border-b border-ink-800 bg-ink-900/60">
          <div className="mx-auto max-w-5xl px-6 py-6 sm:px-10">
            <Link
              href="/mis-eventos"
              className="inline-flex items-center gap-2 text-xs tracking-brand text-cream-400 uppercase transition-colors hover:text-gold-400"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Mis eventos
            </Link>

            {guardado && (
              <p
                role="status"
                className="mt-5 flex items-center gap-2 rounded-full bg-ink-800 px-5 py-2.5 text-sm text-cream-200"
              >
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400" aria-hidden />
                Guardamos los cambios de tu evento.
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl text-cream-50">{evento.nombre}</h1>
                <p className="mt-1 text-sm text-cream-400">
                  {inscritos} {inscritos === 1 ? "persona inscrita" : "personas inscritas"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" asChild>
                  <Link href={`/mis-eventos/${id}/participantes`}>
                    <Users className="size-4" aria-hidden />
                    Participantes
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/mis-eventos/${id}/editar`}>
                    <Pencil className="size-4" aria-hidden />
                    Editar
                  </Link>
                </Button>
                <Button variant="dark" size="sm" asChild>
                  <Link href={`/eventos/${id}`}>
                    <Eye className="size-4" aria-hidden />
                    Ver publicado
                  </Link>
                </Button>
                <EliminarEventoModal
                  eventoId={id}
                  nombre={evento.nombre}
                  inscritos={inscritos}
                />
              </div>
            </div>
          </div>
        </div>

        <p className="mx-auto max-w-5xl px-6 pt-8 text-center text-[10px] tracking-brand text-cream-400 uppercase sm:px-10">
          Así ven tu evento las personas
        </p>

        <EventoDetalle evento={evento} inscritos={inscritos} previsualizacion />
      </main>

      <SiteFooter />
    </>
  );
}
