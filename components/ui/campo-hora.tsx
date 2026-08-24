"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Meridiano = "AM" | "PM";

/**
 * Se escriben solo digitos y se elige AM/PM aparte.
 *
 *   "10"   -> 10:00     (una o dos cifras = la hora en punto)
 *   "1050" -> 10:50
 *   "105"  -> incompleto, falta la segunda cifra del minuto
 *
 * Arranca en PM porque las fiestas son de noche.
 */
function interpretar(digitos: string, meridiano: Meridiano): string | null {
  let h: number;
  let m: number;

  if (digitos.length === 1 || digitos.length === 2) {
    h = Number(digitos);
    m = 0;
  } else if (digitos.length === 4) {
    h = Number(digitos.slice(0, 2));
    m = Number(digitos.slice(2));
  } else {
    return null;
  }

  if (h < 1 || h > 12 || m > 59) return null;

  // 12 AM es medianoche y 12 PM es mediodia: no se les suma nada.
  const h24 = meridiano === "PM" ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h;
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "22:50" -> { digitos: "1050", meridiano: "PM" }, para precargar al editar. */
function desde24(valor: string): { digitos: string; meridiano: Meridiano } | null {
  const partes = /^(\d{2}):(\d{2})/.exec(valor);
  if (!partes) return null;

  const h24 = Number(partes[1]);
  const min = Number(partes[2]);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  return {
    digitos: `${String(h12).padStart(2, "0")}${String(min).padStart(2, "0")}`,
    meridiano: h24 >= 12 ? "PM" : "AM",
  };
}

function mostrar(digitos: string): string {
  return digitos.length <= 2 ? digitos : `${digitos.slice(0, 2)}:${digitos.slice(2)}`;
}

export function CampoHora({
  id,
  name,
  valorInicial,
  onChange,
}: {
  id: string;
  name: string;
  /** Hora en 24 h ("22:50") con la que se precarga el campo. */
  valorInicial?: string;
  /** Recibe la hora en 24 h, o "" mientras lo escrito no sea una hora valida. */
  onChange: (valor24: string) => void;
}) {
  const inicial = valorInicial ? desde24(valorInicial) : null;
  const [digitos, setDigitos] = useState(inicial?.digitos ?? "");
  const [meridiano, setMeridiano] = useState<Meridiano>(inicial?.meridiano ?? "PM");

  function actualizar(nuevosDigitos: string, nuevoMeridiano: Meridiano) {
    setDigitos(nuevosDigitos);
    setMeridiano(nuevoMeridiano);
    onChange(interpretar(nuevosDigitos, nuevoMeridiano) ?? "");
  }

  const incompleto = digitos.length > 0 && interpretar(digitos, meridiano) === null;

  return (
    <div>
      <div
        className={cn(
          "flex h-11 items-center gap-1 rounded-full border bg-ink-950 pr-1 pl-4 transition-colors",
          incompleto
            ? "border-red-500/50"
            : "border-ink-800 focus-within:border-gold-500"
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={mostrar(digitos)}
          aria-invalid={incompleto}
          placeholder="10:30"
          onChange={(ev) =>
            actualizar(ev.target.value.replace(/\D/g, "").slice(0, 4), meridiano)
          }
          onBlur={() => {
            // "10" queda escrito como "10:00": confirma como se interpreto.
            if (digitos.length === 1 || digitos.length === 2) {
              actualizar(digitos.padStart(2, "0") + "00", meridiano);
            }
          }}
          className="h-full w-full min-w-0 bg-transparent text-sm text-cream-50 outline-none placeholder:text-ink-500/70"
        />

        <div
          role="group"
          aria-label="Mañana o tarde"
          className="flex shrink-0 gap-0.5 rounded-full bg-ink-900 p-0.5"
        >
          {(["AM", "PM"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => actualizar(digitos, m)}
              aria-pressed={meridiano === m}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors outline-none",
                "focus-visible:ring-[3px] focus-visible:ring-gold-500/40",
                meridiano === m
                  ? "bg-gradient-to-b from-gold-400 to-gold-600 text-ink-950"
                  : "text-cream-400 hover:text-cream-100"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Lo que viaja en el formulario es la hora en 24 h. */}
      <input type="hidden" name={name} value={interpretar(digitos, meridiano) ?? ""} />

      {incompleto && (
        <p className="mt-1.5 text-xs text-red-400">
          {digitos.length === 3
            ? "Falta un dígito: 1050 son las 10:50"
            : "Hora fuera de rango"}
        </p>
      )}
    </div>
  );
}
