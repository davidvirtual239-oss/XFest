"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type Punto = { lat: number; lng: number };

/** divIcon evita el clasico icono roto de Leaflet al pasar por un bundler. */
const PIN = L.divIcon({
  className: "",
  html: `<svg viewBox="0 0 24 24" width="34" height="34" style="filter:drop-shadow(0 3px 4px rgba(0,0,0,.35))">
    <path fill="#c99a2e" stroke="#2b2118" stroke-width="1.1"
      d="M12 1.6c-4 0-7.2 3.2-7.2 7.2 0 5.4 7.2 13.6 7.2 13.6s7.2-8.2 7.2-13.6c0-4-3.2-7.2-7.2-7.2z"/>
    <circle cx="12" cy="8.8" r="2.7" fill="#fffaf0"/>
  </svg>`,
  iconSize: [34, 34],
  iconAnchor: [17, 33],
});

function CapturarClicks({ onPick }: { onPick: (p: Punto) => void }) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  });
  return null;
}

function Recentrar({ punto }: { punto: Punto | null }) {
  const map = useMap();
  useEffect(() => {
    if (punto) map.setView([punto.lat, punto.lng], Math.max(map.getZoom(), 15));
  }, [punto, map]);
  return null;
}

export default function MapaLeaflet({
  punto,
  centro,
  onPick,
  interactivo,
}: {
  punto: Punto | null;
  centro: Punto;
  onPick?: (p: Punto) => void;
  interactivo: boolean;
}) {
  return (
    <MapContainer
      center={[centro.lat, centro.lng]}
      zoom={punto ? 15 : 12}
      scrollWheelZoom={interactivo}
      dragging={interactivo}
      doubleClickZoom={interactivo}
      zoomControl={interactivo}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {punto && <Marker position={[punto.lat, punto.lng]} icon={PIN} />}
      {onPick && <CapturarClicks onPick={onPick} />}
      <Recentrar punto={punto} />
    </MapContainer>
  );
}
