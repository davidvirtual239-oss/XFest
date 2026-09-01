"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Check, LoaderCircle } from "lucide-react";
import { marcarAsistencia } from "@/app/actions/asistencias";
import type { EstadoAsistencia } from "@/lib/validation/asistencias";
import { cn } from "@/lib/utils";

/**
 * Senal blanda de interes: guardar la fiesta o avisar que piensas ir.
 *
 * NO lleva la cuenta de asistentes — esa la manda la inscripcion, que es la
 * que toma cupo, cobra y arma la lista del organizador. Por eso aca no se
 * muestra ningun numero y ningun boton usa el dorado solido: en la pagina hay
 * una sola accion principal, y es "Inscribirme".
 */
export function AsistenciaBotones({
  eventoId,
  inicial,
  autenticado,
}: {
  eventoId: string;
  inicial: EstadoAsistencia | null;
  autenticado: boolean;
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

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => cambiar("confirmado")}
          disabled={pendiente}
          aria-pressed={voy}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border px-5 text-sm transition-colors outline-none",
            "focus-visible:ring-[3px] focus-visible:ring-gold-500/40 disabled:opacity-60",
            voy
              ? "border-gold-500/50 bg-gold-500/10 text-gold-300"
              : "border-ink-700 text-cream-200 hover:bg-ink-800 hover:text-cream-50"
          )}
        >
          {pendiente ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : voy ? (
            <Check className="size-4" />
          ) : null}
          {voy ? "Pienso ir" : "Marcar que voy"}
        </button>

        <button
          type="button"
          onClick={() => cambiar("guardado")}
          disabled={pendiente}
          aria-pressed={guardado}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border px-5 text-sm transition-colors outline-none",
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
        ) : (
          "Es solo para ti: guarda la fiesta o marca que piensas ir. Tu cupo lo reserva la inscripción."
        )}
      </p>
    </div>
  );
}
