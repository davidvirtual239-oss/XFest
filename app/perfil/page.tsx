import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { BookmarkCheck, CalendarCheck, Star, PartyPopper } from "lucide-react";
import { TopBar } from "@/components/site/top-bar";
import { MainNav } from "@/components/site/main-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { EventoCard, type EventoCardData } from "@/components/site/evento-card";
import { EstrellasLectura } from "@/components/ui/estrellas";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { reputacionOrganizador } from "@/app/actions/valoraciones";

export const metadata: Metadata = { title: "Mi perfil" };

type FilaAsistencia = { estado: string; eventos: EventoCardData | null };

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/perfil");

  const COLUMNAS = "id, nombre, fecha, hora_inicio, direccion, portada_url, precio_clp";

  // Todo en paralelo: son consultas independientes.
  const [asistenciasRes, misEventosRes, valoracionesRes, reputacion] = await Promise.all([
    supabase
      .from("asistencias")
      .select(`estado, eventos ( ${COLUMNAS} )`)
      .eq("user_id", user.id)
      .order("actualizado_en", { ascending: false }),
    supabase.from("eventos").select(COLUMNAS).eq("owner_id", user.id).order("fecha"),
    supabase
      .from("valoraciones")
      .select("id, estrellas_evento, estrellas_organizador, comentario, creado_en, eventos ( id, nombre )")
      .eq("autor_id", user.id)
      .order("creado_en", { ascending: false }),
    reputacionOrganizador(user.id),
  ]);

  const filas = (asistenciasRes.data ?? []) as unknown as FilaAsistencia[];
  const confirmadas = filas.filter((f) => f.estado === "confirmado" && f.eventos).map((f) => f.eventos!);
  const guardadas = filas.filter((f) => f.estado === "guardado" && f.eventos).map((f) => f.eventos!);
  const misEventos = (misEventosRes.data ?? []) as EventoCardData[];
  const valoraciones = (valoracionesRes.data ?? []) as unknown as {
    id: string;
    estrellas_evento: number;
    estrellas_organizador: number;
    comentario: string | null;
    creado_en: string;
    eventos: { id: string; nombre: string } | null;
  }[];

  const nombre =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Mi cuenta";
  const avatar =
    (user.user_metadata?.avatar_url as string | undefined) ??
    (user.user_metadata?.picture as string | undefined) ??
    null;

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950 pb-20">
        <MainNav />

        <div className="mx-auto max-w-7xl px-6 pt-12 sm:px-10">
          {/* Cabecera */}
          <header className="flex flex-col items-center gap-5 rounded-card border border-ink-800 bg-ink-900 p-8 text-center sm:flex-row sm:text-left">
            {avatar ? (
              <Image
                src={avatar}
                alt=""
                width={112}
                height={112}
                className="size-20 shrink-0 rounded-full object-cover ring-1 ring-ink-700"
              />
            ) : (
              <span
                aria-hidden
                className="grid size-20 shrink-0 place-items-center rounded-full bg-gradient-to-b from-gold-400 to-gold-600 font-display text-3xl text-ink-950"
              >
                {nombre.slice(0, 1).toUpperCase()}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-3xl text-cream-50">{nombre}</h1>
              <p className="truncate text-sm text-cream-400">{user.email}</p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="text-[11px] tracking-brand text-cream-400 uppercase">
                  Reputación como organizador
                </span>
                {reputacion.total > 0 ? (
                  <EstrellasLectura valor={reputacion.promedio} total={reputacion.total} size={15} />
                ) : (
                  <span className="text-xs text-cream-400">Aún sin valoraciones</span>
                )}
              </div>
            </div>

            <Button size="sm" asChild>
              <Link href="/crear-evento">Crear evento</Link>
            </Button>
          </header>

          {/* Estadísticas */}
          <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metrica icono={<CalendarCheck className="size-4" />} valor={confirmadas.length} etiqueta="Voy a ir" />
            <Metrica icono={<BookmarkCheck className="size-4" />} valor={guardadas.length} etiqueta="Guardadas" />
            <Metrica icono={<PartyPopper className="size-4" />} valor={misEventos.length} etiqueta="Organizadas" />
            <Metrica icono={<Star className="size-4" />} valor={valoraciones.length} etiqueta="Valoraciones dadas" />
          </ul>

          <Seccion titulo="Voy a ir" vacio="Todavía no confirmas asistencia a ninguna fiesta." eventos={confirmadas} />
          <Seccion titulo="Me interesan" vacio="No has guardado ninguna fiesta." eventos={guardadas} />
          <Seccion titulo="Mis fiestas" vacio="Aún no organizas ninguna." eventos={misEventos} />

          {/* Valoraciones dadas */}
          <section className="mt-14">
            <h2 className="mb-6 font-display text-2xl text-cream-50">Mis valoraciones</h2>
            {valoraciones.length === 0 ? (
              <p className="rounded-card border border-ink-800 bg-ink-900 p-8 text-center text-sm text-cream-400">
                Podrás valorar una fiesta cuando termine y hayas confirmado asistencia.
              </p>
            ) : (
              <ul className="space-y-3">
                {valoraciones.map((v) => (
                  <li
                    key={v.id}
                    className="rounded-2xl border border-ink-800 bg-ink-900 p-5 transition-colors hover:border-ink-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {v.eventos ? (
                        <Link
                          href={`/eventos/${v.eventos.id}`}
                          className="font-medium text-cream-50 hover:text-gold-300"
                        >
                          {v.eventos.nombre}
                        </Link>
                      ) : (
                        <span className="text-cream-400">Evento eliminado</span>
                      )}
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-2 text-xs text-cream-400">
                          Fiesta <EstrellasLectura valor={v.estrellas_evento} size={13} />
                        </span>
                        <span className="flex items-center gap-2 text-xs text-cream-400">
                          Organizador <EstrellasLectura valor={v.estrellas_organizador} size={13} />
                        </span>
                      </div>
                    </div>
                    {v.comentario && <p className="mt-3 text-sm text-cream-200">{v.comentario}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

function Metrica({ icono, valor, etiqueta }: { icono: React.ReactNode; valor: number; etiqueta: string }) {
  return (
    <li className="rounded-card border border-ink-800 bg-ink-900 p-5">
      <span className="flex items-center gap-2 text-gold-400">{icono}</span>
      <p className="mt-2 font-display text-3xl text-cream-50 tabular-nums">{valor}</p>
      <p className="text-[11px] tracking-brand text-cream-400 uppercase">{etiqueta}</p>
    </li>
  );
}

function Seccion({
  titulo,
  vacio,
  eventos,
}: {
  titulo: string;
  vacio: string;
  eventos: EventoCardData[];
}) {
  return (
    <section className="mt-14">
      <h2 className="mb-6 font-display text-2xl text-cream-50">{titulo}</h2>
      {eventos.length === 0 ? (
        <p className="rounded-card border border-ink-800 bg-ink-900 p-8 text-center text-sm text-cream-400">
          {vacio}
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {eventos.map((e, i) => (
            <li key={e.id} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <EventoCard evento={e} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
