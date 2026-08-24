"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface CoverflowSlide {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  /** Si viene, la portada y el titulo navegan aqui. */
  href?: string;
}

export interface CoverflowCarouselProps {
  slides: CoverflowSlide[];
  rotate?: number;
  depth?: number;
  perspective?: number;
  falloff?: number;
  fade?: number;
  cardWidth?: string;
  gap?: number;
  loop?: boolean;
  showCaption?: boolean;
  showPagination?: boolean;
  showNavigation?: boolean;
  label?: string;
  className?: string;
  cardClassName?: string;
  /** Contenido bajo el pie, con el slide activo (p. ej. un CTA). */
  renderFooter?: (slide: CoverflowSlide, index: number) => React.ReactNode;
}

/** Umbral en px por debajo del cual un puntero cuenta como clic y no arrastre. */
const UMBRAL_CLIC = 6;

export function CoverflowCarousel({
  slides,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = "clamp(148px, 22vw, 260px)",
  gap = 0.05,
  loop = true,
  showCaption = false,
  showPagination = false,
  showNavigation = false,
  label = "Carrusel",
  className,
  cardClassName,
  renderFooter,
}: CoverflowCarouselProps) {
  const count = slides.length;

  const frameRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const posRef = React.useRef(0);
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const arrastroRef = React.useRef(false);
  const dragRef = React.useRef<{ id: number; x: number; pos: number; v: number; t: number } | null>(
    null
  );

  const [selected, setSelected] = React.useState(0);
  const [sinMovimiento, setSinMovimiento] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const leer = () => setSinMovimiento(mq.matches);
    leer();
    mq.addEventListener("change", leer);
    return () => mq.removeEventListener("change", leer);
  }, []);

  const indexAt = React.useCallback(
    (pos: number) => (count === 0 ? 0 : ((Math.round(pos) % count) + count) % count),
    [count]
  );

  const paint = React.useCallback(() => {
    const width = widthRef.current;
    if (!width || count === 0) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      let offset = index - pos;
      if (loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }

      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;

      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
      // Solo la tarjeta central recibe el puntero: las de atras no deben
      // interceptar el clic ni aparecer en el orden de tabulacion.
      card.style.pointerEvents = distance < 0.5 ? "auto" : "none";
    });
  }, [count, depth, fade, falloff, gap, loop, rotate]);

  const settle = React.useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSelected(indexAt(target));

      // Con movimiento reducido el carrusel salta: la animacion ES el efecto,
      // asi que no hay version suave que respete la preferencia.
      if (sinMovimiento) {
        posRef.current = target;
        paint();
        return;
      }

      const step = () => {
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        posRef.current += remaining * 0.16;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, paint, sinMovimiento]
  );

  const clamp = React.useCallback(
    (pos: number) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop]
  );

  const goTo = React.useCallback(
    (index: number) => {
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index;
      settle(clamp(target));
    },
    [clamp, count, loop, settle]
  );

  const nudge = React.useCallback(
    (by: number) => settle(clamp(Math.round(targetRef.current) + by)),
    [clamp, settle]
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    arrastroRef.current = false;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;

    if (Math.abs(event.clientX - drag.x) > UMBRAL_CLIC) arrastroRef.current = true;

    const now = performance.now();
    const previous = posRef.current;
    posRef.current = clamp(drag.pos - (event.clientX - drag.x) / pitch);
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    const index = indexAt(posRef.current);
    if (index !== selected) setSelected(index);
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    settle(clamp(Math.round(posRef.current + carried)));
  };

  useIsoLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint]);

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  // Sin slides no hay carrusel: `count = 0` hace que indexAt divida por cero.
  if (count === 0) return null;

  const active = slides[selected];

  return (
    <div
      className={cn("w-full", className)}
      style={{ ["--cf-card" as string]: cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div className="relative">
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              nudge(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              nudge(1);
            }
          }}
          className="cursor-grab overflow-hidden py-10 outline-none focus-visible:ring-[3px] focus-visible:ring-gold-500/40 active:cursor-grabbing"
          style={{
            perspective: `calc(var(--cf-card) * ${perspective})`,
            touchAction: "pan-y",
          }}
        >
          <div
            className="relative select-none"
            style={{ height: "var(--cf-card)", transformStyle: "preserve-3d" }}
          >
            {slides.map((slide, index) => {
              const portada = (
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  draggable={false}
                  sizes="(min-width: 768px) 260px, 55vw"
                  className="pointer-events-none select-none object-cover"
                />
              );

              return (
                <div
                  key={slide.href ?? index}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} de ${count}`}
                  className={cn(
                    "absolute top-0 left-1/2 aspect-square overflow-hidden rounded-2xl bg-ink-900 shadow-lift will-change-transform",
                    cardClassName
                  )}
                  style={{ width: "var(--cf-card)" }}
                >
                  {slide.href ? (
                    <Link
                      href={slide.href}
                      // Un arrastre termina en click sobre el enlace: si el
                      // puntero se movio, no se navega.
                      onClick={(e) => {
                        if (arrastroRef.current) e.preventDefault();
                      }}
                      tabIndex={index === selected ? 0 : -1}
                      className="block size-full outline-none focus-visible:ring-[3px] focus-visible:ring-gold-500/60 focus-visible:ring-inset"
                    >
                      {portada}
                      <span className="sr-only">{slide.title ?? slide.alt}</span>
                    </Link>
                  ) : (
                    portada
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {showNavigation && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => nudge(-1)}
              className="absolute top-1/2 left-2 z-[200] grid size-10 -translate-y-1/2 place-items-center rounded-full border border-ink-700 bg-ink-900/80 text-cream-100 backdrop-blur transition-colors hover:border-gold-500/50 hover:text-gold-300 sm:left-6"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => nudge(1)}
              className="absolute top-1/2 right-2 z-[200] grid size-10 -translate-y-1/2 place-items-center rounded-full border border-ink-700 bg-ink-900/80 text-cream-100 backdrop-blur transition-colors hover:border-gold-500/50 hover:text-gold-300 sm:right-6"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {showCaption && active?.title && (
        <div key={selected} className="mt-2 flex flex-col items-center px-6 text-center">
          {active.href ? (
            <Link
              href={active.href}
              className="font-display text-xl text-cream-50 transition-colors hover:text-gold-300"
            >
              {active.title}
            </Link>
          ) : (
            <p className="font-display text-xl text-cream-50">{active.title}</p>
          )}

          {active.subtitle && <p className="mt-1 text-sm text-cream-400">{active.subtitle}</p>}

          {active.meta && active.meta.length > 0 && (
            <dl className="mt-4 w-full max-w-xs text-xs">
              {active.meta.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 py-1">
                  <dt className="shrink-0 text-cream-400">{row.label}</dt>
                  <dd className="truncate text-cream-100">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {renderFooter?.(active, selected)}
        </div>
      )}

      {showPagination && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Ir al slide ${index + 1}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className={cn(
                "size-2 rounded-full transition-all",
                index === selected ? "w-5 bg-gold-400" : "bg-ink-600 hover:bg-ink-500"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
