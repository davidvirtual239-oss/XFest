"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Galeria de fotos secundarias con visor a pantalla completa.
 * La portada no entra aca: esta arriba, como fondo de la ficha.
 */
export function GaleriaEvento({ fotos, nombre }: { fotos: string[]; nombre: string }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const reducir = useReducedMotion();

  const mover = useCallback(
    (paso: number) => {
      setAbierta((i) => (i == null ? null : (i + paso + fotos.length) % fotos.length));
    },
    [fotos.length]
  );

  useEffect(() => {
    if (abierta == null) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierta(null);
      if (e.key === "ArrowRight") mover(1);
      if (e.key === "ArrowLeft") mover(-1);
    }
    document.addEventListener("keydown", onKey);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierta, mover]);

  if (fotos.length === 0) return null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {fotos.map((url, i) => (
          <li key={url}>
            <button
              type="button"
              onClick={() => setAbierta(i)}
              aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
              className="group relative block aspect-4/3 w-full overflow-hidden rounded-[var(--radius-card)] ring-1 ring-ink-800 transition-all duration-500 ease-brand hover:ring-gold-500/40 focus-visible:ring-[3px] focus-visible:ring-gold-500/40 focus-visible:outline-none"
            >
              <Image
                src={url}
                alt={`${nombre} — foto ${i + 1}`}
                fill
                sizes="(min-width:640px) 33vw, 50vw"
                className="object-cover transition-transform duration-700 ease-brand group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {abierta != null && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/95 p-4"
            initial={reducir ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setAbierta(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Foto ${abierta + 1} de ${fotos.length}`}
          >
            <button
              type="button"
              onClick={() => setAbierta(null)}
              aria-label="Cerrar galería"
              className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-ink-900/80 text-cream-200 backdrop-blur transition-colors hover:bg-ink-800 hover:text-cream-50 focus-visible:ring-[3px] focus-visible:ring-gold-500/40 focus-visible:outline-none"
            >
              <X className="size-5" aria-hidden />
            </button>

            {fotos.length > 1 && (
              <>
                <Flecha lado="izquierda" onClick={() => mover(-1)} />
                <Flecha lado="derecha" onClick={() => mover(1)} />
              </>
            )}

            <motion.div
              key={abierta}
              initial={reducir ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-full max-h-[85vh] w-full max-w-5xl"
            >
              <Image
                src={fotos[abierta]}
                alt={`${nombre} — foto ${abierta + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </motion.div>

            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-ink-900/80 px-3 py-1 text-xs text-cream-300 backdrop-blur">
              {abierta + 1} / {fotos.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Flecha({
  lado,
  onClick,
}: {
  lado: "izquierda" | "derecha";
  onClick: () => void;
}) {
  const Icono = lado === "izquierda" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === "izquierda" ? "Foto anterior" : "Foto siguiente"}
      className={`absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ink-900/80 text-cream-200 backdrop-blur transition-colors hover:bg-ink-800 hover:text-cream-50 focus-visible:ring-[3px] focus-visible:ring-gold-500/40 focus-visible:outline-none ${
        lado === "izquierda" ? "left-3 sm:left-6" : "right-3 sm:right-6"
      }`}
    >
      <Icono className="size-5" aria-hidden />
    </button>
  );
}
