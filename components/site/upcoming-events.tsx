import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarDays, MapPin, PartyPopper } from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listarEventosProximos } from "@/app/actions/eventos";
import { fechaCorta, hora } from "@/lib/formato-evento";

export async function UpcomingEvents() {
  const eventos = await listarEventosProximos(8);

  return (
    <section id="eventos" className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
      <header className="mb-10 text-center">
        <p className="text-[10px] tracking-brand text-gold-700 uppercase">Agenda</p>
        <h2 className="mt-3 font-display text-3xl text-ink-900 sm:text-4xl">
          Eventos disponibles próximamente
        </h2>
        <div className="rule-gold mx-auto mt-5 h-px w-24" aria-hidden />
      </header>

      {eventos.length === 0 ? (
        <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-10 text-center shadow-soft">
          <PartyPopper className="mx-auto size-7 text-gold-600" aria-hidden />
          <p className="mt-4 text-sm text-ink-700">
            Todavía no hay eventos publicados. Sé la primera persona en crear uno.
          </p>
          <Button size="sm" asChild className="mt-6">
            <Link href="/crear-evento">Crear mi evento</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {eventos.map((ev, i) => (
            <li key={ev.id} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
              <Card className="group h-full ring-1 ring-cream-200 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift hover:ring-gold-500/40">
                <Link href={`/eventos/${ev.id}`} className="relative block aspect-4/3 overflow-hidden">
                  <Image
                    src={ev.portada_url}
                    alt=""
                    fill
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-brand group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-ink-950/45 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>

                <CardContent className="text-center">
                  <CardTitle className="normal-case">{ev.nombre}</CardTitle>
                  <CardDescription className="mt-3 flex items-center justify-center gap-1.5">
                    <CalendarDays className="size-3.5 shrink-0 text-gold-600" aria-hidden />
                    {fechaCorta(ev.fecha)} · {hora(ev.hora_inicio)} h
                  </CardDescription>
                  {ev.direccion && (
                    <CardDescription className="mt-1.5 flex items-center justify-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0 text-gold-600" aria-hidden />
                      <span className="line-clamp-1">{ev.direccion}</span>
                    </CardDescription>
                  )}
                </CardContent>

                <CardFooter className="flex justify-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/eventos/${ev.id}`}>
                      Ver evento
                      <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
