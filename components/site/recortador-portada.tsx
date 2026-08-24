"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ImagePlus, Move, ZoomIn } from "lucide-react";

/** Proporcion del recorte: la misma con la que se muestra la portada arriba de la ficha. */
const ASPECTO = 16 / 9;
/** Tamano de salida. Suficiente para el hero a pantalla completa sin subir 8 MB. */
const SALIDA_W = 1600;
const SALIDA_H = Math.round(SALIDA_W / ASPECTO);
const ZOOM_MAX = 4;

export type RecorteHandle = {
  /**
   * Devuelve el recorte listo para subir, o null si no hay nada nuevo que
   * subir (al editar y no tocar la foto que ya estaba guardada).
   */
  exportar: () => Promise<File | null>;
};

type Encuadre = { zoom: number; left: number; top: number };

const ENCUADRE_INICIAL: Encuadre = { zoom: 1, left: 0, top: 0 };

/**
 * Tamano de la imagen como porcentaje del marco, a zoom dado. Se trabaja en
 * porcentajes y no en pixeles para que el mismo encuadre se pueda pintar en
 * dos marcos de distinto tamano (el editor y la miniatura de la tarjeta).
 */
function tamanoCobertura(ratioImagen: number, zoom: number) {
  return ratioImagen > ASPECTO
    ? { w: 100 * zoom * (ratioImagen / ASPECTO), h: 100 * zoom }
    : { w: 100 * zoom, h: 100 * zoom * (ASPECTO / ratioImagen) };
}

/** El marco nunca puede quedar destapado: el offset se recorta a los bordes. */
function limitar(valor: number, tamano: number) {
  return Math.min(0, Math.max(100 - tamano, valor));
}

export const RecortadorPortada = forwardRef<
  RecorteHandle,
  {
    /** Foto recien elegida por el usuario. */
    archivo: File | null;
    /** Portada ya guardada, al editar un evento. */
    urlActual?: string | null;
    onElegir: (file: File | undefined) => void;
    error?: string;
  }
>(function RecortadorPortada({ archivo, urlActual, onElegir, error }, ref) {
  const [src, setSrc] = useState<string | null>(urlActual ?? null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [encuadre, setEncuadre] = useState<Encuadre>(ENCUADRE_INICIAL);
  // Sin cambios no se re-sube nada: ahorra una escritura y deja intacta la
  // foto original cuando el usuario solo vino a corregir el precio.
  const [tocado, setTocado] = useState(false);
  // La foto ya guardada se pide con CORS para poder re-encuadrarla en canvas.
  // Si el bucket no manda las cabeceras, la imagen ni carga: se reintenta sin
  // CORS y el re-encuadre queda deshabilitado, pero la vista previa se ve.
  const [sinCors, setSinCors] = useState(false);

  const marcoRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const arrastreRef = useRef<{ x: number; y: number } | null>(null);

  // Cada archivo nuevo trae su propio object URL, que hay que liberar.
  useEffect(() => {
    if (!archivo) return;
    const url = URL.createObjectURL(archivo);
    setSrc(url);
    setEncuadre(ENCUADRE_INICIAL);
    setTocado(true);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const cobertura = ratio ? tamanoCobertura(ratio, encuadre.zoom) : { w: 100, h: 100 };

  function moverEnPorcentaje(dxPx: number, dyPx: number) {
    const marco = marcoRef.current;
    if (!marco) return;

    const { width, height } = marco.getBoundingClientRect();
    setEncuadre((e) => {
      const c = ratio ? tamanoCobertura(ratio, e.zoom) : { w: 100, h: 100 };
      return {
        ...e,
        left: limitar(e.left + (dxPx / width) * 100, c.w),
        top: limitar(e.top + (dyPx / height) * 100, c.h),
      };
    });
    setTocado(true);
  }

  function cambiarZoom(nuevo: number) {
    setEncuadre((e) => {
      const antes = ratio ? tamanoCobertura(ratio, e.zoom) : { w: 100, h: 100 };
      const despues = ratio ? tamanoCobertura(ratio, nuevo) : { w: 100, h: 100 };
      // Se conserva el centro del marco al acercar o alejar.
      const cx = (50 - e.left) / antes.w;
      const cy = (50 - e.top) / antes.h;
      return {
        zoom: nuevo,
        left: limitar(50 - cx * despues.w, despues.w),
        top: limitar(50 - cy * despues.h, despues.h),
      };
    });
    setTocado(true);
  }

  const exportar = useCallback(async (): Promise<File | null> => {
    const img = imgRef.current;
    if (!img || !ratio || !tocado) return null;

    const c = tamanoCobertura(ratio, encuadre.zoom);
    const { naturalWidth: iw, naturalHeight: ih } = img;

    // Rectangulo visible, en pixeles de la imagen original.
    const sx = (-encuadre.left / c.w) * iw;
    const sy = (-encuadre.top / c.h) * ih;
    const sw = (100 / c.w) * iw;
    const sh = (100 / c.h) * ih;

    const canvas = document.createElement("canvas");
    canvas.width = SALIDA_W;
    canvas.height = SALIDA_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    try {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SALIDA_W, SALIDA_H);
    } catch {
      // Canvas contaminado: la foto guardada vino de otro origen sin CORS.
      // Se deja la original tal cual en vez de romper el guardado.
      return null;
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9)
    );
    if (!blob) return null;

    return new File([blob], "portada.webp", { type: "image/webp" });
  }, [encuadre, ratio, tocado]);

  useImperativeHandle(ref, () => ({ exportar }), [exportar]);

  const estiloImagen = {
    width: `${cobertura.w}%`,
    height: `${cobertura.h}%`,
    left: `${encuadre.left}%`,
    top: `${encuadre.top}%`,
  };

  return (
    <div className="space-y-3">
      {/* Marco = encuadre real de la portada en la ficha del evento. */}
      <div
        ref={marcoRef}
        className="relative aspect-16/9 w-full overflow-hidden rounded-[var(--radius-card)] border border-ink-800 bg-ink-900"
      >
        {src ? (
          <>
            <img
              ref={imgRef}
              key={sinCors ? "directo" : "cors"}
              src={src}
              alt=""
              crossOrigin={archivo || sinCors ? undefined : "anonymous"}
              draggable={false}
              onLoad={(ev) => {
                const el = ev.currentTarget;
                setRatio(el.naturalWidth / el.naturalHeight);
              }}
              onError={() => {
                if (!archivo && !sinCors) setSinCors(true);
              }}
              onPointerDown={(ev) => {
                ev.currentTarget.setPointerCapture(ev.pointerId);
                arrastreRef.current = { x: ev.clientX, y: ev.clientY };
              }}
              onPointerMove={(ev) => {
                const a = arrastreRef.current;
                if (!a) return;
                moverEnPorcentaje(ev.clientX - a.x, ev.clientY - a.y);
                arrastreRef.current = { x: ev.clientX, y: ev.clientY };
              }}
              onPointerUp={() => {
                arrastreRef.current = null;
              }}
              onPointerCancel={() => {
                arrastreRef.current = null;
              }}
              className="absolute max-w-none cursor-grab touch-none object-cover select-none active:cursor-grabbing"
              style={estiloImagen}
            />
            <p className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink-950/75 px-3 py-1 text-[11px] text-cream-200 backdrop-blur">
              <Move className="size-3" aria-hidden />
              Arrastra para encuadrar
            </p>
          </>
        ) : (
          <label
            htmlFor="portada"
            className="flex size-full cursor-pointer flex-col items-center justify-center gap-2 text-xs text-cream-400"
          >
            <ImagePlus className="size-6" aria-hidden />
            JPG, PNG o WEBP · máx. 8 MB
          </label>
        )}
      </div>

      {src && (
        <>
          <label className="flex items-center gap-3">
            <ZoomIn className="size-4 shrink-0 text-cream-400" aria-hidden />
            <span className="sr-only">Zoom de la portada</span>
            <input
              type="range"
              min={1}
              max={ZOOM_MAX}
              step={0.02}
              value={encuadre.zoom}
              onChange={(ev) => cambiarZoom(Number(ev.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-800 accent-gold-500"
            />
          </label>

          {/* Como se recorta la misma foto en las tarjetas de los listados. */}
          <div className="flex items-center gap-4">
            <div className="w-28 shrink-0">
              <p className="mb-1.5 text-[10px] tracking-brand text-cream-400 uppercase">
                En tarjetas
              </p>
              <div className="relative grid aspect-4/3 w-full place-items-center overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
                {/* El marco 16/9 se escala para cubrir el 4/3, igual que object-cover. */}
                <div className="relative aspect-16/9 w-[133.334%]">
                  {ratio && (
                    <img
                      src={src}
                      alt=""
                      draggable={false}
                      className="absolute max-w-none object-cover"
                      style={estiloImagen}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1 text-xs text-cream-400">
              <p>Así se va a ver tu foto una vez publicada.</p>
              <label
                htmlFor="portada"
                className="mt-2 inline-block cursor-pointer text-gold-400 underline-offset-4 transition-colors hover:text-gold-300 hover:underline"
              >
                Cambiar la foto
              </label>
            </div>
          </div>
        </>
      )}

      <input
        id="portada"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(ev) => onElegir(ev.target.files?.[0])}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});
