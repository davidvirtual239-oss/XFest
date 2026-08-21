import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventoCard } from "@/components/site/evento-card";
import { listarEventosProximos } from "@/app/actions/eventos";

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
        <>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {eventos.map((ev, i) => (
              <li key={ev.id} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
                <EventoCard evento={ev} />
              </li>
            ))}
          </ul>

          <div className="mt-12 flex justify-center">
            <Button variant="outline" asChild>
              <Link href="/eventos">
                Ver todos los eventos
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
