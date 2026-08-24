"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lectura: media estrella incluida, para promedios tipo 4.3. */
export function EstrellasLectura({
  valor,
  total,
  size = 14,
  className,
}: {
  valor: number;
  total?: number;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (valor / 5) * 100));

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="relative inline-flex"
        role="img"
        aria-label={`${valor.toFixed(1)} de 5 estrellas${total != null ? `, ${total} valoraciones` : ""}`}
      >
        <span className="inline-flex text-ink-600">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={size} aria-hidden />
          ))}
        </span>
        {/* Capa dorada recortada al porcentaje: permite medias estrellas */}
        <span
          className="absolute inset-0 inline-flex overflow-hidden text-gold-400"
          style={{ width: `${pct}%` }}
          aria-hidden
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={size} fill="currentColor" className="shrink-0" />
          ))}
        </span>
      </span>
      {total != null && (
        <span className="text-xs text-cream-400 tabular-nums">
          {valor > 0 ? valor.toFixed(1) : "—"}
          {total > 0 && <span className="ml-1">({total})</span>}
        </span>
      )}
    </span>
  );
}

/** Entrada: 5 radios reales, para que funcione con teclado y sin JS. */
export function EstrellasInput({
  name,
  defaultValue = 0,
  label,
}: {
  name: string;
  defaultValue?: number;
  label: string;
}) {
  const [valor, setValor] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const id = useId();
  const activo = hover || valor;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-[11px] tracking-brand text-cream-400 uppercase">{label}</legend>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            htmlFor={`${id}-${n}`}
            onMouseEnter={() => setHover(n)}
            className="cursor-pointer rounded p-0.5 transition-transform hover:scale-110 focus-within:ring-[3px] focus-within:ring-gold-500/40"
          >
            <input
              id={`${id}-${n}`}
              type="radio"
              name={name}
              value={n}
              checked={valor === n}
              onChange={() => setValor(n)}
              className="sr-only"
            />
            <Star
              size={26}
              className={cn(
                "transition-colors",
                n <= activo ? "text-gold-400" : "text-ink-700"
              )}
              fill={n <= activo ? "currentColor" : "none"}
              aria-hidden
            />
            <span className="sr-only">{n} de 5</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
