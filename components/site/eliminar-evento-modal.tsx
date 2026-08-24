"use client";

import { useActionState, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LoaderCircle, Trash2, TriangleAlert, X } from "lucide-react";
import { eliminarEventoAction, type EventoState } from "@/app/actions/eventos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: EventoState = { ok: false };

/** Misma normalizacion que revalida el servidor: mayusculas y bordes no cuentan. */
function coincide(a: string, b: string) {
  return a.trim().toLocaleLowerCase("es") === b.trim().toLocaleLowerCase("es");
}

export function EliminarEventoModal({
  eventoId,
  nombre,
  inscritos,
}: {
  eventoId: string;
  nombre: string;
  inscritos: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [estado, formAction, pendiente] = useActionState(eliminarEventoAction, ESTADO_INICIAL);
  const reducir = useReducedMotion();
  const puedeBorrar = coincide(texto, nombre);

  // Escape cierra y se bloquea el scroll del fondo mientras el modal esta arriba.
  useEffect(() => {
    if (!abierto) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("keydown", onKey);

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto]);

  return (
    <>
      <Button
        type="button"
        variant="dark"
        size="sm"
        onClick={() => setAbierto(true)}
        className="border-red-500/30 text-red-300 hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-200"
      >
        <Trash2 className="size-4" aria-hidden />
        Eliminar evento
      </Button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            className="fixed inset-0 z-[100] grid place-items-center bg-ink-950/80 p-4 backdrop-blur-sm"
            initial={reducir ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setAbierto(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-eliminar"
              initial={reducir ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducir ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-[var(--radius-card)] border border-ink-700 bg-ink-900 p-6 shadow-lift sm:p-8"
            >
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="absolute top-4 right-4 rounded-full p-1.5 text-cream-400 transition-colors hover:bg-ink-800 hover:text-cream-50 focus-visible:ring-[3px] focus-visible:ring-gold-500/40 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>

              <div className="grid size-11 place-items-center rounded-full bg-red-500/10 text-red-400">
                <TriangleAlert className="size-5" aria-hidden />
              </div>

              <h2 id="titulo-eliminar" className="mt-4 font-display text-xl text-cream-50">
                Eliminar este evento
              </h2>
              <p className="mt-2 text-sm text-cream-400">
                Se borra para siempre, junto con{" "}
                <b className="text-cream-200">
                  {inscritos} {inscritos === 1 ? "inscripción" : "inscripciones"}
                </b>
                . Esta acción no se puede deshacer.
              </p>

              <form action={formAction} className="mt-6 space-y-4">
                <input type="hidden" name="eventoId" value={eventoId} />

                <div>
                  <Label htmlFor="confirmacion">
                    Escribe <span className="normal-case text-gold-400">{nombre}</span> para
                    confirmar
                  </Label>
                  <Input
                    id="confirmacion"
                    name="confirmacion"
                    autoFocus
                    autoComplete="off"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder={nombre}
                    className="mt-2 h-11 rounded-full border border-ink-800 bg-ink-950 transition-colors focus:border-red-500/60"
                  />
                  {estado.fieldErrors?.confirmacion?.[0] && (
                    <p className="mt-1.5 text-xs text-red-400">
                      {estado.fieldErrors.confirmacion[0]}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAbierto(false)}
                    disabled={pendiente}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="dark"
                    size="sm"
                    disabled={!puedeBorrar || pendiente}
                    className="border-red-500/40 bg-red-500/15 text-red-200 hover:border-red-500/70 hover:bg-red-500/25 hover:text-red-100"
                  >
                    {pendiente && <LoaderCircle className="size-4 animate-spin" />}
                    Eliminar definitivamente
                  </Button>
                </div>

                {estado.error && (
                  <p role="alert" className="text-xs text-red-400">
                    {estado.error}
                  </p>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
