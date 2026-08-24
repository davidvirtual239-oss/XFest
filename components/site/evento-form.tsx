"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { LoaderCircle, ImagePlus } from "lucide-react";
import {
  crearEventoAction,
  editarEventoAction,
  type Evento,
  type EventoState,
} from "@/app/actions/eventos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MapaSelector } from "@/components/site/mapa";
import { hoyISO } from "@/lib/validation/eventos";
import { hora } from "@/lib/formato-evento";

const ESTADO_INICIAL: EventoState = { ok: false };

function Campo({
  label,
  htmlFor,
  errores,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  errores?: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-2">{children}</div>
      {errores?.[0] && (
        <p className="mt-1.5 text-xs text-red-700">{errores[0]}</p>
      )}
    </div>
  );
}

const INPUT_CAJA =
  "h-11 rounded-full border border-ink-800 bg-ink-950 focus:border-gold-500 transition-colors";

/** Mismo formulario para crear y para editar: `evento` decide el modo. */
export function EventoForm({ evento }: { evento?: Evento }) {
  const editando = evento != null;
  const [estado, formAction, pendiente] = useActionState(
    editando ? editarEventoAction : crearEventoAction,
    ESTADO_INICIAL
  );
  const [sinLimite, setSinLimite] = useState(editando && evento.capacidad == null);
  // Solo la foto recien elegida es un object URL; la guardada ya es una URL real.
  const [preview, setPreview] = useState<string | null>(null);
  const e = estado.fieldErrors;
  const portadaVisible = preview ?? evento?.portada_url ?? null;

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function elegirFoto(file: File | undefined) {
    setPreview((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  return (
    <form action={formAction} className="space-y-10">
      {editando && <input type="hidden" name="eventoId" value={evento.id} />}

      <section className="space-y-6">
        <Campo label="Nombre del evento" htmlFor="nombre" errores={e?.nombre}>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={100}
            defaultValue={evento?.nombre}
            placeholder="Ej: Fiesta de aniversario en la terraza"
            className={INPUT_CAJA}
          />
        </Campo>

        <Campo label="Descripción" htmlFor="descripcion" errores={e?.descripcion}>
          <Textarea
            id="descripcion"
            name="descripcion"
            maxLength={2000}
            defaultValue={evento?.descripcion ?? ""}
            placeholder="Cuenta de qué se trata, qué incluye y qué pueden esperar los asistentes."
          />
        </Campo>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        <Campo label="Fecha" htmlFor="fecha" errores={e?.fecha}>
          <Input
            id="fecha"
            name="fecha"
            type="date"
            required
            min={hoyISO()}
            defaultValue={evento?.fecha}
            className={INPUT_CAJA}
          />
        </Campo>
        <Campo label="Hora de inicio" htmlFor="horaInicio" errores={e?.horaInicio}>
          <Input
            id="horaInicio"
            name="horaInicio"
            type="time"
            required
            defaultValue={evento && hora(evento.hora_inicio)}
            className={INPUT_CAJA}
          />
        </Campo>
        <Campo label="Hora de término" htmlFor="horaTermino" errores={e?.horaTermino}>
          <Input
            id="horaTermino"
            name="horaTermino"
            type="time"
            required
            defaultValue={evento && hora(evento.hora_termino)}
            className={INPUT_CAJA}
          />
        </Campo>
      </section>

      <section>
        <Label>Ubicación</Label>
        <div className="mt-2">
          <MapaSelector
            inicial={
              evento && {
                lat: evento.lat,
                lng: evento.lng,
                direccion: evento.direccion ?? "",
              }
            }
          />
        </div>
        {(e?.lat || e?.lng) && (
          <p className="mt-1.5 text-xs text-red-700">Marca la ubicación del evento en el mapa.</p>
        )}
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <Campo label="Precio por persona (CLP)" htmlFor="precioClp" errores={e?.precioClp}>
          <Input
            id="precioClp"
            name="precioClp"
            type="number"
            required
            min={0}
            step={1}
            defaultValue={evento?.precio_clp}
            placeholder="0 si es gratis"
            className={INPUT_CAJA}
          />
        </Campo>

        <Campo label="Cantidad de asistentes" htmlFor="capacidad" errores={e?.capacidad}>
          <Input
            id="capacidad"
            name="capacidad"
            type="number"
            min={1}
            step={1}
            disabled={sinLimite}
            defaultValue={evento?.capacidad ?? undefined}
            placeholder="Ej: 100"
            className={`${INPUT_CAJA} disabled:bg-ink-800`}
          />
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-cream-200">
            <Checkbox
              name="sinLimiteCapacidad"
              checked={sinLimite}
              onChange={(ev) => setSinLimite(ev.target.checked)}
            />
            Sin límite de personas
          </label>
        </Campo>
      </section>

      <section>
        <Label htmlFor="portada">Foto principal</Label>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start">
          <label
            htmlFor="portada"
            className="flex h-40 w-full cursor-pointer items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-dashed border-ink-800 bg-ink-900 transition-colors hover:border-gold-500 sm:w-64"
          >
            {portadaVisible ? (
              <Image
                src={portadaVisible}
                alt="Vista previa de la foto"
                width={256}
                height={160}
                unoptimized
                className="size-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-2 text-xs text-cream-400">
                <ImagePlus className="size-6" aria-hidden />
                JPG, PNG o WEBP · máx. 8 MB
              </span>
            )}
          </label>
          {editando && (
            <p className="text-xs text-cream-400 sm:pt-2">
              Toca la imagen para reemplazarla. Si no eliges otra, se mantiene la actual.
            </p>
          )}
          <input
            id="portada"
            name="portada"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={!editando}
            className="sr-only"
            onChange={(ev) => elegirFoto(ev.target.files?.[0])}
          />
        </div>
        {e?.portada?.[0] && <p className="mt-1.5 text-xs text-red-700">{e.portada[0]}</p>}
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink-800 pt-8">
        <Button type="submit" size="lg" disabled={pendiente}>
          {pendiente && <LoaderCircle className="size-4 animate-spin" />}
          {editando ? "Guardar cambios" : "Publicar evento"}
        </Button>
        <p
          role="status"
          aria-live="polite"
          className={`text-xs text-red-700 transition-opacity ${estado.error ? "opacity-100" : "opacity-0"}`}
        >
          {estado.error ?? " "}
        </p>
      </div>
    </form>
  );
}
