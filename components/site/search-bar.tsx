"use client";

import { useActionState, useState, useTransition } from "react";
import { Search, LoaderCircle, MapPin } from "lucide-react";
import { buscarAction, type SearchState } from "@/app/actions/search";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initial: SearchState = { ok: true };

/**
 * Client Component minimo. Vive en la franja bajo el nav (SearchBand).
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
          "group flex h-14 items-center gap-1 rounded-full border bg-ink-900 pr-1.5 pl-5 shadow-lift transition-colors",
          state.ok ? "border-ink-700 focus-within:border-gold-500" : "border-red-400"
        )}
      >
        <Search className="size-[18px] shrink-0 text-gold-400" aria-hidden />
        <Input
          name="q"
          type="search"
          autoComplete="off"
          aria-label="Buscar eventos"
          placeholder="BUSCA UN EVENTO CERCA DE TI"
          className="h-12 border-0 px-3 text-sm tracking-[0.06em] uppercase shadow-none"
        />

        <button
          type="button"
          onClick={pedirUbicacion}
          aria-label="Usar mi ubicación"
          title={coords ? "Ubicación activada" : "Buscar cerca de mí"}
          className={cn(
            "grid size-10 place-items-center rounded-full transition-colors",
            coords ? "text-gold-600" : "text-cream-400 hover:text-gold-600"
          )}
        >
          <MapPin className="size-[18px]" />
        </button>

        <button
          type="submit"
          disabled={pending}
          aria-label="Buscar"
          className="grid size-11 place-items-center rounded-full bg-gradient-to-b from-gold-400 to-gold-600 text-ink-950 shadow-gold transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle className="size-[18px] animate-spin" />
          ) : (
            <Search className="size-[18px]" />
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
          "mt-2 px-5 text-xs text-red-400 transition-opacity",
          state.error ? "opacity-100" : "opacity-0"
        )}
      >
        {state.error ?? " "}
      </p>
    </form>
  );
}
