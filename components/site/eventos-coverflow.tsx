"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoverflowCarousel, type CoverflowSlide } from "@/components/ui/coverflow-carousel";
import { Button } from "@/components/ui/button";
import type { EventoCardData } from "@/components/site/evento-card";
import { fechaCorta, hora } from "@/lib/formato-evento";
import { CLP } from "@/lib/utils";

/** Traduce un evento a la forma que entiende el carrusel. */
function aSlide(e: EventoCardData): CoverflowSlide {
  // El subtitulo ya lleva fecha y hora: repetirla aqui era ruido.
  const meta: { label: string; value: string }[] = [];
  if (e.direccion) meta.push({ label: "Dónde", value: e.direccion });
  if (e.precio_clp != null) {
    meta.push({ label: "Precio", value: e.precio_clp === 0 ? "Gratis" : CLP.format(e.precio_clp) });
  }

  return {
    src: e.portada_url,
    alt: e.nombre,
    title: e.nombre,
    subtitle: `${fechaCorta(e.fecha)} · ${hora(e.hora_inicio)} h`,
    meta,
    href: `/eventos/${e.id}`,
  };
}

export function EventosCoverflow({ eventos }: { eventos: EventoCardData[] }) {
  const slides = eventos.map(aSlide);

  return (
    <CoverflowCarousel
      slides={slides}
      label="Próximas fiestas"
      showCaption
      showPagination
      // Con una o dos fiestas el bucle deja huecos visibles: se desactiva.
      loop={slides.length > 2}
      showNavigation={slides.length > 1}
      cardWidth="clamp(190px, 26vw, 300px)"
      renderFooter={(slide) =>
        slide.href ? (
          <Button variant="outline" size="sm" asChild className="mt-5">
            <Link href={slide.href}>
              Ver evento
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        ) : null
      }
    />
  );
}
