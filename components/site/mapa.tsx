"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, Search, LoaderCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Punto } from "@/components/site/mapa-leaflet";

const MapaLeaflet = dynamic(() => import("@/components/site/mapa-leaflet"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ink-900 text-xs text-cream-400">
      Cargando mapa…
    </div>
  ),
});

const SANTIAGO: Punto = { lat: -33.4489, lng: -70.6693 };

type Sugerencia = { label: string; lat: number; lng: number };

/** Solo lectura: muestra un punto fijo, sin interaccion. */
export function MapaVista({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="h-72 overflow-hidden rounded-[var(--radius-card)] ring-1 ring-ink-800 sm:h-96">
      <MapaLeaflet punto={{ lat, lng }} centro={{ lat, lng }} interactivo={false} />
    </div>
  );
}

/**
 * Selector: click en el mapa o busqueda de direccion. Escribe el resultado en
 * inputs ocultos para que viaje en el FormData del Server Action.
 */
export function MapaSelector() {
  const [punto, setPunto] = useState<Punto | null>(null);
  const [direccion, setDireccion] = useState("");
  const [consulta, setConsulta] = useState("");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [buscando, setBuscando] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (consulta.trim().length < 3) {
      setSugerencias([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBuscando(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(consulta)}`, {
          signal: ctrl.signal,
        });
        setSugerencias(res.ok ? await res.json() : []);
      } catch {
        // abortada o red caida: no hay nada que mostrar
      } finally {
        setBuscando(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [consulta]);

  function elegir(s: Sugerencia) {
    setPunto({ lat: s.lat, lng: s.lng });
    setDireccion(s.label);
    setConsulta(s.label);
    setSugerencias([]);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex h-11 items-center gap-2 rounded-full border border-ink-800 bg-ink-950 px-4 transition-colors focus-within:border-gold-500">
          <Search className="size-4 shrink-0 text-cream-400" aria-hidden />
          <Input
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Busca una dirección o comuna"
            aria-label="Buscar dirección"
            className="h-auto px-0"
          />
          {buscando && <LoaderCircle className="size-4 shrink-0 animate-spin text-cream-400" />}
        </div>

        {sugerencias.length > 0 && (
          <ul className="absolute z-[500] mt-2 w-full overflow-hidden rounded-2xl border border-ink-700 bg-ink-800 shadow-lift">
            {sugerencias.map((s) => (
              <li key={`${s.lat},${s.lng}`}>
                <button
                  type="button"
                  onClick={() => elegir(s)}
                  className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm text-cream-200 transition-colors hover:bg-ink-900"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="h-72 overflow-hidden rounded-[var(--radius-card)] ring-1 ring-ink-800">
        <MapaLeaflet
          punto={punto}
          centro={punto ?? SANTIAGO}
          interactivo
          onPick={(p) => setPunto(p)}
        />
      </div>

      <p className="text-xs text-cream-400">
        {punto
          ? `Ubicación seleccionada: ${punto.lat.toFixed(5)}, ${punto.lng.toFixed(5)}`
          : "Busca la dirección o haz click en el mapa para marcar dónde será tu evento."}
      </p>

      <input type="hidden" name="lat" value={punto?.lat ?? ""} />
      <input type="hidden" name="lng" value={punto?.lng ?? ""} />
      <input type="hidden" name="direccion" value={direccion} />
    </div>
  );
}
