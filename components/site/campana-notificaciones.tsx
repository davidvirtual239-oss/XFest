"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell, UserPlus } from "lucide-react";
import {
  marcarNotificacionesLeidas,
  type Notificacion,
} from "@/app/actions/notificaciones";
import { cn } from "@/lib/utils";

const RELATIVO = new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" });

/** "hace 3 h", "ayer": mas legible que una fecha completa en una lista corta. */
function haceCuanto(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "recién";
  if (minutos < 60) return RELATIVO.format(-minutos, "minute");
  if (minutos < 1440) return RELATIVO.format(-Math.round(minutos / 60), "hour");
  return RELATIVO.format(-Math.round(minutos / 1440), "day");
}

export function CampanaNotificaciones({
  notificaciones,
  sinLeer,
}: {
  notificaciones: Notificacion[];
  sinLeer: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [, marcar] = useTransition();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const reducir = useReducedMotion();

  useEffect(() => setAbierto(false), [pathname]);

  useEffect(() => {
    if (!abierto) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAbierto(false);
        disparadorRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [abierto]);

  function alternar() {
    setAbierto((v) => {
      // Abrirlas ya cuenta como leerlas: no hay un "marcar como leida" aparte.
      if (!v && sinLeer > 0) marcar(() => void marcarNotificacionesLeidas());
      return !v;
    });
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={disparadorRef}
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        aria-haspopup="true"
        aria-controls="panel-notificaciones"
        aria-label={
          sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : "Notificaciones"
        }
        className={cn(
          "relative grid size-10 place-items-center rounded-full border transition-colors outline-none",
          "focus-visible:ring-[3px] focus-visible:ring-gold-500/40",
          abierto
            ? "border-gold-500/50 bg-ink-800 text-cream-50"
            : "border-ink-700 text-cream-200 hover:border-ink-600 hover:bg-ink-800"
        )}
      >
        <Bell className="size-4.5" aria-hidden />
        {sinLeer > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-gradient-to-b from-gold-400 to-gold-600 px-1 text-[10px] font-semibold text-ink-950"
          >
            {sinLeer > 9 ? "9+" : sinLeer}
          </span>
        )}
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            id="panel-notificaciones"
            initial={reducir ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducir ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-card border border-ink-700 bg-ink-900 shadow-lift"
          >
            <p className="border-b border-ink-800 px-4 py-3 text-[10px] tracking-brand text-cream-400 uppercase">
              Notificaciones
            </p>

            {notificaciones.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-cream-400">
                Cuando alguien se inscriba en tus eventos, te avisamos acá.
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-ink-800 overflow-y-auto">
                {notificaciones.map((n) => {
                  const contenido = (
                    <>
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-ink-800 text-gold-400">
                        <UserPlus className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-cream-50">{n.titulo}</span>
                        {n.detalle && (
                          <span className="mt-0.5 block truncate text-xs text-cream-400">
                            {n.detalle}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] text-cream-400">
                          {haceCuanto(n.creado_en)}
                        </span>
                      </span>
                    </>
                  );

                  return (
                    <li key={n.id} className={cn(n.leida_en == null && "bg-gold-500/5")}>
                      {n.evento_id ? (
                        <Link
                          href={`/mis-eventos/${n.evento_id}/participantes`}
                          onClick={() => setAbierto(false)}
                          className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-ink-800 focus-visible:ring-[3px] focus-visible:ring-gold-500/40 focus-visible:outline-none"
                        >
                          {contenido}
                        </Link>
                      ) : (
                        <div className="flex items-start gap-3 px-4 py-3">{contenido}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
