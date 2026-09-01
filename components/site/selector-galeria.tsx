"use client";

import { useEffect, useMemo } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_FOTOS_GALERIA } from "@/lib/validation/eventos";

/**
 * Fotos secundarias del evento. Se ven en la galeria de la ficha, no en la
 * portada. El estado vive en el formulario: aca solo se pinta y se avisa.
 */
export function SelectorGaleria({
  guardadas,
  nuevas,
  onAgregar,
  onQuitarGuardada,
  onQuitarNueva,
  error,
}: {
  /** URLs ya subidas, al editar un evento. */
  guardadas: string[];
  nuevas: File[];
  onAgregar: (files: File[]) => void;
  onQuitarGuardada: (url: string) => void;
  onQuitarNueva: (indice: number) => void;
  error?: string;
}) {
  // Un object URL por archivo, recreado solo cuando cambia la lista.
  const previews = useMemo(() => nuevas.map((f) => URL.createObjectURL(f)), [nuevas]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const total = guardadas.length + nuevas.length;
  const quedan = MAX_FOTOS_GALERIA - total;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {guardadas.map((url) => (
          <Miniatura
            key={url}
            src={url}
            onQuitar={() => onQuitarGuardada(url)}
            etiqueta="Quitar esta foto de la galería"
          />
        ))}

        {previews.map((src, i) => (
          <Miniatura
            key={src}
            src={src}
            onQuitar={() => onQuitarNueva(i)}
            etiqueta={`Quitar ${nuevas[i].name}`}
          />
        ))}

        {quedan > 0 && (
          <label
            htmlFor="galeria"
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-800 bg-ink-900 text-cream-400 transition-colors hover:border-gold-500 hover:text-cream-200"
          >
            <ImagePlus className="size-5" aria-hidden />
            <span className="text-[11px]">Agregar</span>
          </label>
        )}
      </div>

      <input
        id="galeria"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(ev) => {
          // Se corta en el tope para no dejar que el input mande de mas.
          onAgregar(Array.from(ev.target.files ?? []).slice(0, quedan));
          ev.target.value = "";   // permite volver a elegir el mismo archivo
        }}
      />

      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : (
        <p className="text-xs text-cream-400">
          Opcional · {total} de {MAX_FOTOS_GALERIA} fotos
        </p>
      )}
    </div>
  );
}

function Miniatura({
  src,
  onQuitar,
  etiqueta,
}: {
  src: string;
  onQuitar: () => void;
  etiqueta: string;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
      {/* next/image no aporta aca: son previews locales y miniaturas chicas. */}
      <img src={src} alt="" className="size-full object-cover" />
      <button
        type="button"
        onClick={onQuitar}
        aria-label={etiqueta}
        className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-ink-950/80 text-cream-200 opacity-0 backdrop-blur transition-all hover:bg-red-500/80 hover:text-white focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-gold-500/40 focus-visible:outline-none group-hover:opacity-100"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
