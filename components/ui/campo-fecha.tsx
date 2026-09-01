"use client";

import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Campo de fecha que abre el calendario al hacer click en cualquier parte.
 *
 * Un <input type="date"> pelado solo abre el calendario si se acierta el
 * indicador nativo, un icono de pocos pixeles que sobre fondo oscuro casi no
 * se ve. Aca ese indicador se estira sobre todo el campo (invisible) y ademas
 * se llama a showPicker(), que es el camino que entienden Firefox y Safari.
 */
export function CampoFecha({
  id,
  name,
  value,
  onChange,
  min,
  required,
  className,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (valor: string) => void;
  min?: string;
  required?: boolean;
  className?: string;
}) {
  function abrir(el: HTMLInputElement) {
    try {
      el.showPicker();
    } catch {
      // Sin soporte o sin gesto del usuario: queda el indicador nativo.
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="date"
        value={value}
        min={min}
        required={required}
        onChange={(ev) => onChange(ev.target.value)}
        onClick={(ev) => abrir(ev.currentTarget)}
        onKeyDown={(ev) => {
          // El teclado tambien abre el calendario, sin pelear con las flechas
          // que sirven para ajustar el dia ya escrito.
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            abrir(ev.currentTarget);
          }
        }}
        className={cn(
          "h-11 w-full cursor-pointer rounded-full border border-ink-800 bg-ink-950 px-4 pr-11 text-sm text-cream-50",
          "outline-none transition-colors focus:border-gold-500",
          // El indicador nativo pasa a cubrir el campo completo, invisible.
          "[&::-webkit-calendar-picker-indicator]:absolute",
          "[&::-webkit-calendar-picker-indicator]:inset-0",
          "[&::-webkit-calendar-picker-indicator]:h-auto",
          "[&::-webkit-calendar-picker-indicator]:w-auto",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:opacity-0",
          className
        )}
      />
      <CalendarDays
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gold-600"
      />
    </div>
  );
}
