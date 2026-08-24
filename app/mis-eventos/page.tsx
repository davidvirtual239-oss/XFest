import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import { TopBar } from "@/components/site/top-bar";
import { MainNav } from "@/components/site/main-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { EventoCard, type EventoCardData } from "@/components/site/evento-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mis eventos" };

export default async function MisEventosPage({
  searchParams,
}: {
  searchParams: Promise<{ eliminado?: string }>;
}) {
  const { eliminado } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/mis-eventos");

  // RLS ya limita la escritura al dueno; el filtro por owner_id es lo que
  // acota la LECTURA, porque la policy de select es publica.
  const { data, error } = await supabase
    .from("eventos")
    .select("id, nombre, fecha, hora_inicio, direccion, portada_url, precio_clp")
    .eq("owner_id", user.id)
    .order("fecha", { ascending: true });

  if (error) throw new Error(`No pudimos cargar tus eventos: ${error.message}`);

  const eventos = (data ?? []) as EventoCardData[];

  // Un solo viaje para los contadores de todas las tarjetas.
  const inscritosPorEvento = new Map<string, number>();
  if (eventos.length > 0) {
    const { data: filas } = await supabase
      .from("inscripciones")
      .select("evento_id")
      .in("evento_id", eventos.map((e) => e.id))
      .neq("estado", "cancelada");

    for (const fila of filas ?? []) {
      inscritosPorEvento.set(fila.evento_id, (inscritosPorEvento.get(fila.evento_id) ?? 0) + 1);
    }
  }

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950 pb-20">
        <MainNav />

        <div className="mx-auto max-w-7xl px-6 pt-14 sm:px-10">
          {eliminado && (
            <p
              role="status"
              className="mx-auto mb-10 flex max-w-md items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-sm text-cream-200 shadow-soft"
            >
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" aria-hidden />
              El evento se eliminó junto con sus inscripciones.
            </p>
          )}

          <header className="mb-10 text-center">
            <p className="text-[10px] tracking-brand text-gold-400 uppercase">Tu cuenta</p>
            <h1 className="mt-3 font-display text-3xl text-cream-50 sm:text-4xl">Mis eventos</h1>
            <p className="mt-3 text-sm text-cream-400">
              {eventos.length === 0
                ? "Todavía no has publicado ninguno."
                : `${eventos.length} ${eventos.length === 1 ? "evento publicado" : "eventos publicados"}`}
            </p>
            <div className="rule-gold mx-auto mt-6 h-px w-24" aria-hidden />
          </header>

          {eventos.length === 0 ? (
            <div className="mx-auto max-w-md rounded-card border border-ink-800 bg-ink-900 p-10 text-center">
              <div className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-ink-800 text-gold-400">
                <CalendarPlus className="size-5" />
              </div>
              <p className="font-display text-xl text-cream-50">Publica tu primer evento</p>
              <p className="mt-2 text-sm text-cream-400">
                Aparecerá en la portada apenas lo publiques.
              </p>
              <Button size="sm" asChild className="mt-6">
                <Link href="/crear-evento">Crear evento</Link>
              </Button>
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {eventos.map((evento, i) => (
                <li
                  key={evento.id}
                  className="animate-rise"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <EventoCard
                    evento={evento}
                    href={`/mis-eventos/${evento.id}`}
                    cta="Administrar"
                    inscritos={inscritosPorEvento.get(evento.id) ?? 0}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
