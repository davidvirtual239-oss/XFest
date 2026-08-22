import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SearchX, PartyPopper } from "lucide-react";
import { TopBar } from "@/components/site/top-bar";
import { MainNav } from "@/components/site/main-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { EventoCard } from "@/components/site/evento-card";
import { Button } from "@/components/ui/button";
import { buscarEventos } from "@/app/actions/search";
import {
  searchSchema,
  searchParamsToQueryString,
  RESULTADOS_POR_PAGINA,
} from "@/lib/validation/search";

export const metadata: Metadata = { title: "Eventos" };

type Query = Record<string, string | string[] | undefined>;

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const sp = await searchParams;
  // Parametros invalidos en la URL no deben romper la pagina: se cae al default.
  const params = searchSchema.parse({
    q: typeof sp.q === "string" ? sp.q : "",
    lat: typeof sp.lat === "string" ? sp.lat : undefined,
    lng: typeof sp.lng === "string" ? sp.lng : undefined,
    radioKm: typeof sp.radioKm === "string" ? sp.radioKm : undefined,
    page: typeof sp.page === "string" ? sp.page : undefined,
  });

  const eventos = await buscarEventos(params);
  const filtrando = Boolean(params.q) || params.lat != null;
  const base = searchParamsToQueryString(params);
  const linkPagina = (n: number) => `/eventos?${base ? `${base}&` : ""}page=${n}`;

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950 pb-20">
        <MainNav />

        <div className="mx-auto max-w-7xl px-6 pt-14 sm:px-10">
          <header className="mb-10 text-center">
            <p className="text-[10px] tracking-brand text-gold-400 uppercase">Agenda</p>
            <h1 className="mt-3 font-display text-3xl text-cream-50 sm:text-4xl">
              {params.q ? `Resultados para “${params.q}”` : "Todos los eventos"}
            </h1>
            {params.lat != null && (
              <p className="mt-3 text-sm text-cream-400">
                A menos de {params.radioKm} km de tu ubicación
              </p>
            )}
            <div className="rule-gold mx-auto mt-5 h-px w-24" aria-hidden />
          </header>

          {eventos.length === 0 ? (
            <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-ink-900 p-10 text-center shadow-soft">
              {filtrando ? (
                <>
                  <SearchX className="mx-auto size-7 text-gold-600" aria-hidden />
                  <p className="mt-4 text-sm text-cream-200">
                    No encontramos eventos con esos filtros. Probá con otra búsqueda
                    o ampliá la zona.
                  </p>
                  <Button variant="outline" size="sm" asChild className="mt-6">
                    <Link href="/eventos">Ver todos los eventos</Link>
                  </Button>
                </>
              ) : (
                <>
                  <PartyPopper className="mx-auto size-7 text-gold-600" aria-hidden />
                  <p className="mt-4 text-sm text-cream-200">
                    Todavía no hay eventos publicados. Sé la primera persona en crear uno.
                  </p>
                  <Button size="sm" asChild className="mt-6">
                    <Link href="/crear-evento">Crear mi evento</Link>
                  </Button>
                </>
              )}
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {eventos.map((ev, i) => (
                <li key={ev.id} className="animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
                  <EventoCard evento={ev} />
                </li>
              ))}
            </ul>
          )}

          {(params.page > 1 || eventos.length === RESULTADOS_POR_PAGINA) && (
            <nav
              aria-label="Paginación"
              className="mt-14 flex items-center justify-center gap-3"
            >
              {params.page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={linkPagina(params.page - 1)} rel="prev">
                    Anterior
                  </Link>
                </Button>
              )}
              <span className="text-xs tracking-brand text-cream-400 uppercase">
                Página {params.page}
              </span>
              {eventos.length === RESULTADOS_POR_PAGINA && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={linkPagina(params.page + 1)} rel="next">
                    Siguiente
                  </Link>
                </Button>
              )}
            </nav>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
