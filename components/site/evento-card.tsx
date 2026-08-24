import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, CalendarDays, MapPin, Navigation, Users } from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fechaCorta, hora } from "@/lib/formato-evento";
import { CLP } from "@/lib/utils";

export type EventoCardData = {
  id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string;
  direccion: string | null;
  portada_url: string;
  precio_clp?: number;
  distancia_km?: number | null;
};

export function EventoCard({
  evento,
  href = `/eventos/${evento.id}`,
  cta = "Ver evento",
  inscritos,
}: {
  evento: EventoCardData;
  /** El panel del organizador apunta a /mis-eventos/[id] en vez de a la ficha. */
  href?: string;
  cta?: string;
  inscritos?: number;
}) {

  return (
    <Card className="group h-full ring-1 ring-ink-800 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift hover:ring-gold-500/40">
      <Link href={href} className="relative block aspect-4/3 overflow-hidden">
        <Image
          src={evento.portada_url}
          alt=""
          fill
          sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-brand group-hover:scale-105"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink-950/45 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          aria-hidden
        />
        {evento.precio_clp != null && (
          <span className="absolute top-3 right-3 rounded-full bg-ink-950/75 px-3 py-1 text-[11px] font-medium text-cream-50 backdrop-blur">
            {evento.precio_clp === 0 ? "Gratis" : CLP.format(evento.precio_clp)}
          </span>
        )}
      </Link>

      <CardContent className="text-center">
        <CardTitle className="normal-case">{evento.nombre}</CardTitle>

        <CardDescription className="mt-3 flex items-center justify-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0 text-gold-600" aria-hidden />
          {fechaCorta(evento.fecha)} · {hora(evento.hora_inicio)} h
        </CardDescription>

        {evento.direccion && (
          <CardDescription className="mt-1.5 flex items-center justify-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-gold-600" aria-hidden />
            <span className="line-clamp-1">{evento.direccion}</span>
          </CardDescription>
        )}

        {evento.distancia_km != null && (
          <CardDescription className="mt-1.5 flex items-center justify-center gap-1.5">
            <Navigation className="size-3.5 shrink-0 text-gold-600" aria-hidden />
            a {evento.distancia_km} km de ti
          </CardDescription>
        )}

        {inscritos != null && (
          <CardDescription className="mt-1.5 flex items-center justify-center gap-1.5 text-cream-200">
            <Users className="size-3.5 shrink-0 text-gold-600" aria-hidden />
            {inscritos} {inscritos === 1 ? "inscrito" : "inscritos"}
          </CardDescription>
        )}
      </CardContent>

      <CardFooter className="flex justify-center">
        <Button variant="outline" size="sm" asChild>
          <Link href={href}>
            {cta}
            <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
