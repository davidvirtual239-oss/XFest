"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Check, LoaderCircle } from "lucide-react";
import { marcarAsistencia } from "@/app/actions/asistencias";
import type { EstadoAsistencia } from "@/lib/validation/asistencias";
import type { Cupos } from "@/app/actions/asistencias";
import { cn } from "@/lib/utils";

export function AsistenciaBotones({
  eventoId,
  inicial,
  autenticado,
  cupos,
}: {
  eventoId: string;
  inicial: EstadoAsistencia | null;
  autenticado: boolean;
  cupos: Cupos;
}) {
  const [estado, setEstado] = useState<EstadoAsistencia | null>(inicial);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function cambiar(nuevo: EstadoAsistencia) {
    if (!autenticado) {
      router.push(`/login?next=/eventos/${eventoId}`);
      return;
    }
    // Alternar: volver a pulsar el estado activo lo quita.
    const destino = estado === nuevo ? null : nuevo;
    const previo = estado;
    setEstado(destino); // optimista
    setError(null);

    iniciar(async () => {
      const r = await marcarAsistencia(eventoId, destino);
      if (!r.ok) {
        setEstado(previo); // revertir si el servidor rechaza
        setError(r.error ?? "No pudimos guardar el cambio.");
      } else {
        router.refresh();
      }
    });
  }

  const voy = estado === "confirmado";
  const guardado = estado === "guardado";
  // Quien ya confirmo ocupa un cupo: para esa persona nunca esta agotado.
  const sinCupo = cupos.agotado && !voy;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => cambiar("confirmado")}
          disabled={pendiente || sinCupo}
          aria-pressed={voy}
          title={sinCupo ? "Aforo completo" : undefined}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium transition-all duration-300 ease-brand outline-none",
            "focus-visible:ring-[3px] focus-visible:ring-gold-500/40 disabled:opacity-60",
            voy
              ? "bg-gradient-to-b from-gold-400 to-gold-600 text-ink-950 shadow-gold"
              : sinCupo
                ? "cursor-not-allowed border border-ink-700 text-cream-400"
                : "border border-gold-500/50 text-gold-300 hover:border-gold-500 hover:bg-gold-500/10"
          )}
        >
          {pendiente ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : voy ? (
            <Check className="size-4" />
          ) : null}
          {voy ? "Voy a ir" : sinCupo ? "Aforo completo" : "Confirmar asistencia"}
        </button>

        <button
          type="button"
          onClick={() => cambiar("guardado")}
          disabled={pendiente}
          aria-pressed={guardado}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm transition-colors outline-none",
            "focus-visible:ring-[3px] focus-visible:ring-gold-500/40 disabled:opacity-60",
            guardado
              ? "border-ink-600 bg-ink-800 text-cream-50"
              : "border-ink-700 text-cream-200 hover:bg-ink-800 hover:text-cream-50"
          )}
        >
          {guardado ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          {guardado ? "Guardada" : "Me interesa"}
        </button>
      </div>

      <p className="text-xs text-cream-400" aria-live="polite">
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : cupos.capacidad === null ? (
          cupos.confirmados > 0
            ? `${cupos.confirmados} ${cupos.confirmados === 1 ? "persona confirmó" : "personas confirmaron"} asistencia`
            : "Sé el primero en confirmar"
        ) : cupos.agotado ? (
          <span className="text-gold-300">
            Aforo completo · {cupos.confirmados} de {cupos.capacidad}
          </span>
        ) : (
          `${cupos.confirmados} de ${cupos.capacidad} · ${
            cupos.disponibles === 1 ? "queda 1 cupo" : `quedan ${cupos.disponibles} cupos`
          }`
        )}
      </p>
    </div>
  );
}
