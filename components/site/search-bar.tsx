"use client";

import { useActionState, useState, useTransition } from "react";
import { Search, LoaderCircle, MapPin } from "lucide-react";
import { buscarAction, type SearchState } from "@/app/actions/search";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initial: SearchState = { ok: true };

/**
 * Client Component minimo: es el UNICO island del Top Bar.
 * Mantiene lat/lng en inputs ocultos para que el Server Action
 * pueda validar la geolocalizacion sin llamadas extra.
 */
export function SearchBar({ className }: { className?: string }) {
  const [state, formAction] = useActionState(buscarAction, initial);
  const [pending, startTransition] = useTransition();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  function pedirUbicacion() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        startTransition(() =>
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        ),
      () => setCoords(null),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  return (
    <form action={formAction} className={cn("w-full", className)}>
      <div
        className={cn(
          "group flex h-11 items-center gap-1 rounded-full border bg-white/90 pr-1 pl-4 shadow-soft backdrop-blur transition-colors",
          state.ok ? "border-cream-200 focus-within:border-gold-500" : "border-red-400"
        )}
      >
        <Search className="size-4 shrink-0 text-gold-600" aria-hidden />
        <Input
          name="q"
          type="search"
          autoComplete="off"
          aria-label="Buscar tu fiesta ideal"
          placeholder="TU FIESTA IDEAL, FÁCIL Y RÁPIDA"
          className="h-9 border-0 px-2 text-[13px] tracking-[0.08em] uppercase shadow-none"
        />

        <button
          type="button"
          onClick={pedirUbicacion}
          aria-label="Usar mi ubicación"
          title={coords ? "Ubicación activada" : "Buscar cerca de mí"}
          className={cn(
            "grid size-8 place-items-center rounded-full transition-colors",
            coords ? "text-gold-600" : "text-ink-500 hover:text-gold-600"
          )}
        >
          <MapPin className="size-4" />
        </button>

        <button
          type="submit"
          disabled={pending}
          aria-label="Buscar"
          className="grid size-9 place-items-center rounded-full bg-gradient-to-b from-gold-400 to-gold-600 text-ink-950 shadow-gold transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
        </button>
      </div>

      {coords && (
        <>
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
          <input type="hidden" name="radioKm" value={25} />
        </>
      )}

      <p
        role="status"
        aria-live="polite"
        className={cn(
          "mt-1 px-4 text-[11px] text-red-600 transition-opacity",
          state.error ? "opacity-100" : "opacity-0"
        )}
      >
        {state.error ?? " "}
      </p>
    </form>
  );
}
