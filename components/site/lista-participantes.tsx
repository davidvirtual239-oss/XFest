"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { EstadoInscripcion, Participante } from "@/app/actions/inscripciones";
import { formatearRut } from "@/lib/validation/rut";
import { CLP, cn } from "@/lib/utils";

type Campo = "nombre" | "rut" | "creado_en";
type Sentido = "asc" | "desc";

const FILTROS: { valor: EstadoInscripcion | "todos"; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "confirmada", etiqueta: "Confirmados" },
  { valor: "pendiente", etiqueta: "Pendientes de pago" },
  { valor: "cancelada", etiqueta: "Cancelados" },
];

const ESTILO_ESTADO: Record<EstadoInscripcion, string> = {
  confirmada: "bg-emerald-500/10 text-emerald-300",
  pendiente: "bg-gold-500/10 text-gold-300",
  cancelada: "bg-red-500/10 text-red-300",
};

const ETIQUETA_ESTADO: Record<EstadoInscripcion, string> = {
  confirmada: "Confirmada",
  pendiente: "Pendiente",
  cancelada: "Cancelada",
};

const FECHA_HORA = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** El RUT se ordena por su valor numerico: "9.000.000-1" va antes que "10.000.000-K". */
function rutNumerico(rut: string): number {
  return Number(rut.split("-")[0]) || 0;
}

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function Encabezado({
  campo,
  etiqueta,
  orden,
  onOrdenar,
  className,
}: {
  campo: Campo;
  etiqueta: string;
  orden: { campo: Campo; sentido: Sentido };
  onOrdenar: (campo: Campo) => void;
  className?: string;
}) {
  const activo = orden.campo === campo;
  const Flecha = orden.sentido === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={activo ? (orden.sentido === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-3 text-left font-medium", className)}
    >
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-1 tracking-brand uppercase transition-colors",
          "focus-visible:ring-[3px] focus-visible:ring-gold-500/40 focus-visible:outline-none",
          activo ? "text-gold-400" : "text-cream-400 hover:text-cream-100"
        )}
      >
        {etiqueta}
        <Flecha
          className={cn("size-3 transition-opacity", activo ? "opacity-100" : "opacity-0")}
          aria-hidden
        />
      </button>
    </th>
  );
}

export function ListaParticipantes({ participantes }: { participantes: Participante[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<EstadoInscripcion | "todos">("todos");
  const [orden, setOrden] = useState<{ campo: Campo; sentido: Sentido }>({
    campo: "creado_en",
    sentido: "desc",
  });

  function ordenarPor(campo: Campo) {
    setOrden((actual) =>
      actual.campo === campo
        ? { campo, sentido: actual.sentido === "asc" ? "desc" : "asc" }
        : // Nombre y RUT arrancan ascendentes; la fecha, con lo mas reciente arriba.
          { campo, sentido: campo === "creado_en" ? "desc" : "asc" }
    );
  }

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    // El RUT se busca sin puntos ni guion, como venga tipeado.
    const qRut = busqueda.replace(/[^0-9kK]/g, "").toLowerCase();

    const filtrados = participantes.filter((p) => {
      if (filtro !== "todos" && p.estado !== filtro) return false;
      if (!q) return true;

      return (
        normalizar(p.nombre).includes(q) ||
        normalizar(p.email).includes(q) ||
        p.telefono.includes(busqueda.replace(/\D/g, "")) ||
        (qRut.length > 0 && p.rut.replace("-", "").toLowerCase().includes(qRut))
      );
    });

    const factor = orden.sentido === "asc" ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      if (orden.campo === "nombre") return factor * a.nombre.localeCompare(b.nombre, "es");
      if (orden.campo === "rut") return factor * (rutNumerico(a.rut) - rutNumerico(b.rut));
      return factor * a.creado_en.localeCompare(b.creado_en);
    });
  }, [participantes, busqueda, filtro, orden]);

  if (participantes.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-ink-900 p-10 text-center shadow-soft">
        <Users className="mx-auto size-7 text-gold-600" aria-hidden />
        <p className="mt-4 font-display text-xl text-cream-50">Aún nadie se inscribe</p>
        <p className="mt-2 text-sm text-cream-400">
          Cuando alguien se inscriba, aparecerá acá con sus datos de contacto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-11 flex-1 items-center gap-2 rounded-full border border-ink-800 bg-ink-950 px-4 transition-colors focus-within:border-gold-500">
          <Search className="size-4 shrink-0 text-cream-400" aria-hidden />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, RUT, correo o celular"
            aria-label="Buscar participantes"
            className="h-auto px-0"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              onClick={() => setFiltro(f.valor)}
              aria-pressed={filtro === f.valor}
              className={cn(
                "h-9 rounded-full border px-4 text-xs transition-colors",
                "focus-visible:ring-[3px] focus-visible:ring-gold-500/40 focus-visible:outline-none",
                filtro === f.valor
                  ? "border-gold-500/50 bg-gold-500/10 text-gold-300"
                  : "border-ink-800 text-cream-400 hover:border-ink-700 hover:text-cream-100"
              )}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <p role="status" className="text-xs text-cream-400">
        {visibles.length} de {participantes.length}{" "}
        {participantes.length === 1 ? "inscripción" : "inscripciones"}
      </p>

      <div className="overflow-x-auto rounded-[var(--radius-card)] bg-ink-900 shadow-soft">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <thead className="border-b border-ink-800 text-[10px]">
            <tr>
              <Encabezado campo="nombre" etiqueta="Nombre" orden={orden} onOrdenar={ordenarPor} />
              <Encabezado campo="rut" etiqueta="RUT" orden={orden} onOrdenar={ordenarPor} />
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-medium tracking-brand text-cream-400 uppercase">
                Contacto
              </th>
              <th scope="col" className="px-4 py-3 text-left text-[10px] font-medium tracking-brand text-cream-400 uppercase">
                Estado
              </th>
              <Encabezado
                campo="creado_en"
                etiqueta="Inscrito"
                orden={orden}
                onOrdenar={ordenarPor}
              />
            </tr>
          </thead>

          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-cream-400">
                  Ningún participante coincide con la búsqueda.
                </td>
              </tr>
            ) : (
              visibles.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-ink-800/70 transition-colors last:border-0 hover:bg-ink-800/40"
                >
                  <td className="px-4 py-3 text-cream-50">{p.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs text-cream-200">
                    {formatearRut(p.rut)}
                  </td>
                  <td className="px-4 py-3 text-cream-200">
                    <a
                      href={`mailto:${p.email}`}
                      className="break-all transition-colors hover:text-gold-400"
                    >
                      {p.email}
                    </a>
                    <br />
                    <a
                      href={`tel:${p.telefono}`}
                      className="text-xs text-cream-400 transition-colors hover:text-gold-400"
                    >
                      {p.telefono}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2.5 py-1 text-[11px]",
                        ESTILO_ESTADO[p.estado]
                      )}
                    >
                      {ETIQUETA_ESTADO[p.estado]}
                    </span>
                    {p.monto_clp > 0 && (
                      <span className="mt-1 block text-[11px] text-cream-400">
                        {CLP.format(p.monto_clp)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-cream-400">
                    {FECHA_HORA.format(new Date(p.creado_en))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
