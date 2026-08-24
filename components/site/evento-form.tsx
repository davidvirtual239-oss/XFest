"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircle, MoonStar } from "lucide-react";
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
import { CampoFecha } from "@/components/ui/campo-fecha";
import { CampoHora } from "@/components/ui/campo-hora";
import { MapaSelector } from "@/components/site/mapa";
import { SelectorGaleria } from "@/components/site/selector-galeria";
import { RecortadorPortada, type RecorteHandle } from "@/components/site/recortador-portada";
import { hoyISO, PRECIO_MINIMO_CLP } from "@/lib/validation/eventos";
import { hora, fechaLarga } from "@/lib/formato-evento";

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
      {errores?.[0] && <p className="mt-1.5 text-xs text-red-400">{errores[0]}</p>}
    </div>
  );
}

const INPUT_CAJA =
  "h-11 rounded-full border border-ink-800 bg-ink-950 focus:border-gold-500 transition-colors";

function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Fecha de termino que se deduce del horario: si cierra a una hora anterior a
 * la de apertura, la fiesta cruza la medianoche. Es lo que la gente quiere
 * decir con "de 22 a 4".
 */
function terminoDeducido(fecha: string, horaInicio: string, horaTermino: string): string {
  if (!fecha) return "";
  if (!horaInicio || !horaTermino) return fecha;
  return horaTermino <= horaInicio ? sumarDias(fecha, 1) : fecha;
}

/** Mismo formulario para crear y para editar: `evento` decide el modo. */
export function EventoForm({ evento }: { evento?: Evento }) {
  const editando = evento != null;

  // El submit se maneja a mano en vez de con <form action>: React 19 resetea
  // el formulario cuando la accion termina, y eso borraba todo lo que el
  // usuario habia escrito bien cada vez que un campo salia mal.
  const [estado, setEstado] = useState<EventoState>(ESTADO_INICIAL);
  const [enviando, enviar] = useTransition();

  const [fecha, setFecha] = useState(evento?.fecha ?? "");
  const [horaInicio, setHoraInicio] = useState(evento ? hora(evento.hora_inicio) : "");
  const [fechaTermino, setFechaTermino] = useState(evento?.fecha_termino ?? "");
  const [horaTermino, setHoraTermino] = useState(evento ? hora(evento.hora_termino) : "");

  const [sinLimite, setSinLimite] = useState(editando && evento.capacidad == null);
  const [portada, setPortada] = useState<File | null>(null);
  const [galeriaGuardada, setGaleriaGuardada] = useState<string[]>(evento?.galeria_urls ?? []);
  const [galeriaNueva, setGaleriaNueva] = useState<File[]>([]);

  // La fecha de termino se deduce sola del horario, salvo que el usuario la
  // haya tocado a mano: ahi manda el, y una fiesta puede durar varios dias.
  const [terminoManual, setTerminoManual] = useState(
    editando &&
      evento.fecha_termino !==
        terminoDeducido(evento.fecha, hora(evento.hora_inicio), hora(evento.hora_termino))
  );

  const recorteRef = useRef<RecorteHandle>(null);
  const e = estado.fieldErrors;

  useEffect(() => {
    if (terminoManual) return;
    setFechaTermino(terminoDeducido(fecha, horaInicio, horaTermino));
  }, [fecha, horaInicio, horaTermino, terminoManual]);

  const cruzaMedianoche = Boolean(fecha && fechaTermino && fechaTermino > fecha);

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;

    // Las horas viajan en inputs hidden, que el navegador no valida con
    // `required`. Se avisa aca en vez de gastar un viaje al servidor.
    if (!horaInicio || !horaTermino) {
      setEstado({
        ok: false,
        error: "Completa la hora de inicio y de término.",
        fieldErrors: {
          ...(horaInicio ? {} : { horaInicio: ["Indica la hora"] }),
          ...(horaTermino ? {} : { horaTermino: ["Indica la hora"] }),
        },
      });
      return;
    }

    enviar(async () => {
      const fd = new FormData(form);

      // La portada viaja recortada, no como el archivo original. Si devuelve
      // null es que no hubo cambios y el servidor conserva la que ya estaba.
      const recorte = await recorteRef.current?.exportar();
      fd.delete("portada");
      if (recorte) fd.set("portada", recorte);

      for (const foto of galeriaNueva) fd.append("galeria", foto);
      fd.set("galeriaConservar", JSON.stringify(galeriaGuardada));

      const accion = editando ? editarEventoAction : crearEventoAction;
      setEstado(await accion(ESTADO_INICIAL, fd));
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
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

      {/* Inicio y termino como bloques separados, cada uno con su fecha: es la
          unica forma de expresar una fiesta que arranca un dia y cierra otro.
          Uno sobre otro y no en dos columnas: en columnas la fecha larga y el
          selector AM/PM no caben y el texto sale cortado. */}
      <section className="space-y-4">
        <div className="space-y-4">
          <fieldset className="rounded-2xl border border-ink-800 p-4">
            <legend className="px-2 text-[11px] font-medium tracking-brand text-gold-400 uppercase">
              Comienza
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Fecha" htmlFor="fecha" errores={e?.fecha}>
                <CampoFecha
                  id="fecha"
                  name="fecha"
                  required
                  min={hoyISO()}
                  value={fecha}
                  onChange={setFecha}
                />
              </Campo>
              <Campo label="Hora" htmlFor="horaInicio" errores={e?.horaInicio}>
                <CampoHora
                  id="horaInicio"
                  name="horaInicio"
                  valorInicial={evento ? hora(evento.hora_inicio) : undefined}
                  onChange={setHoraInicio}
                />
              </Campo>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-ink-800 p-4">
            <legend className="px-2 text-[11px] font-medium tracking-brand text-gold-400 uppercase">
              Termina
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Fecha" htmlFor="fechaTermino" errores={e?.fechaTermino}>
                <CampoFecha
                  id="fechaTermino"
                  name="fechaTermino"
                  required
                  min={fecha || hoyISO()}
                  value={fechaTermino}
                  onChange={(valor) => {
                    setTerminoManual(true);
                    setFechaTermino(valor);
                  }}
                />
              </Campo>
              <Campo label="Hora" htmlFor="horaTermino" errores={e?.horaTermino}>
                <CampoHora
                  id="horaTermino"
                  name="horaTermino"
                  valorInicial={evento ? hora(evento.hora_termino) : undefined}
                  onChange={setHoraTermino}
                />
              </Campo>
            </div>
          </fieldset>
        </div>

        {cruzaMedianoche && (
          <p className="flex items-center gap-2 rounded-2xl bg-ink-800 px-4 py-3 text-xs text-cream-200">
            <MoonStar className="size-4 shrink-0 text-gold-400" aria-hidden />
            <span className="first-letter:uppercase">
              Termina el {fechaLarga(fechaTermino)}
              {horaTermino && ` a las ${horaTermino}`} h.
            </span>
          </p>
        )}
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
          <p className="mt-1.5 text-xs text-red-400">Marca la ubicación del evento en el mapa.</p>
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
          {!e?.precioClp && (
            <p className="mt-1.5 text-xs text-cream-400">
              Gratis con 0, o desde ${PRECIO_MINIMO_CLP.toLocaleString("es-CL")} si cobras entrada.
            </p>
          )}
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
        <Label>Foto principal</Label>
        <p className="mt-1 mb-3 text-xs text-cream-400">
          Es la que se ve en la portada del evento y en los listados.
        </p>
        <RecortadorPortada
          ref={recorteRef}
          archivo={portada}
          urlActual={evento?.portada_url ?? null}
          onElegir={(file) => setPortada(file ?? null)}
          error={e?.portada?.[0]}
        />
      </section>

      <section>
        <Label>Fotos secundarias</Label>
        <p className="mt-1 mb-3 text-xs text-cream-400">
          Se muestran en la galería, dentro de la página del evento.
        </p>
        <SelectorGaleria
          guardadas={galeriaGuardada}
          nuevas={galeriaNueva}
          onAgregar={(files) => setGaleriaNueva((actual) => [...actual, ...files])}
          onQuitarGuardada={(url) =>
            setGaleriaGuardada((actual) => actual.filter((u) => u !== url))
          }
          onQuitarNueva={(i) => setGaleriaNueva((actual) => actual.filter((_, j) => j !== i))}
          error={e?.galeria?.[0]}
        />
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-ink-800 pt-8">
        <Button type="submit" size="lg" disabled={enviando}>
          {enviando && <LoaderCircle className="size-4 animate-spin" />}
          {editando ? "Guardar cambios" : "Publicar evento"}
        </Button>
        <p
          role="status"
          aria-live="polite"
          className={`text-xs text-red-400 transition-opacity ${estado.error ? "opacity-100" : "opacity-0"}`}
        >
          {estado.error ?? " "}
        </p>
      </div>
    </form>
  );
}
