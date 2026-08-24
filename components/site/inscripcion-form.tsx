"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, ShieldCheck, CreditCard } from "lucide-react";
import { inscribirseAction, type InscripcionState } from "@/app/actions/inscripciones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatearRut } from "@/lib/validation/rut";
import { CLP } from "@/lib/utils";

const ESTADO_INICIAL: InscripcionState = { ok: false };

const INPUT_CAJA =
  "h-11 rounded-full border border-ink-800 bg-ink-950 focus:border-gold-500 transition-colors";

function Campo({
  label,
  htmlFor,
  errores,
  ayuda,
  children,
}: {
  label: string;
  htmlFor: string;
  errores?: string[];
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-2">{children}</div>
      {errores?.[0] ? (
        <p className="mt-1.5 text-xs text-red-400">{errores[0]}</p>
      ) : (
        ayuda && <p className="mt-1.5 text-xs text-cream-400">{ayuda}</p>
      )}
    </div>
  );
}

export type DatosPrellenados = { nombre: string; email: string; telefono: string };

export function InscripcionForm({
  eventoId,
  precioClp,
  datos,
  haySesion,
}: {
  eventoId: string;
  precioClp: number;
  datos: DatosPrellenados;
  haySesion: boolean;
}) {
  const [estado, formAction, pendiente] = useActionState(inscribirseAction, ESTADO_INICIAL);
  // El RUT se muestra con puntos mientras se escribe; el server lo normaliza igual.
  const [rut, setRut] = useState("");
  const e = estado.fieldErrors;
  const esPagado = precioClp > 0;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="eventoId" value={eventoId} />

      {haySesion && (
        <p className="flex items-center gap-2 rounded-2xl bg-ink-800 px-4 py-3 text-xs text-cream-200">
          <ShieldCheck className="size-4 shrink-0 text-gold-400" aria-hidden />
          Completamos tus datos con los de tu cuenta. Puedes corregirlos si hace falta.
        </p>
      )}

      <Campo label="Nombre completo" htmlFor="nombre" errores={e?.nombre}>
        <Input
          id="nombre"
          name="nombre"
          required
          maxLength={80}
          autoComplete="name"
          defaultValue={datos.nombre}
          placeholder="Ej: Camila Rojas"
          className={INPUT_CAJA}
        />
      </Campo>

      <div className="grid gap-6 sm:grid-cols-2">
        <Campo label="Correo" htmlFor="email" errores={e?.email} ayuda="Ahí te llega tu entrada.">
          <Input
            id="email"
            name="email"
            type="email"
            required
            maxLength={120}
            autoComplete="email"
            defaultValue={datos.email}
            placeholder="tu@correo.cl"
            className={INPUT_CAJA}
          />
        </Campo>

        <Campo
          label="Celular"
          htmlFor="telefono"
          errores={e?.telefono}
          ayuda="Ej: +56 9 1234 5678"
        >
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            required
            autoComplete="tel"
            defaultValue={datos.telefono}
            placeholder="+56 9 1234 5678"
            className={INPUT_CAJA}
          />
        </Campo>
      </div>

      <Campo label="RUT" htmlFor="rut" errores={e?.rut} ayuda="Se usa para validar tu entrada en la puerta.">
        <Input
          id="rut"
          name="rut"
          required
          inputMode="text"
          value={rut}
          onChange={(ev) => setRut(ev.target.value)}
          onBlur={(ev) => setRut(formatearRut(ev.target.value))}
          placeholder="12.345.678-5"
          className={INPUT_CAJA}
        />
      </Campo>

      {esPagado && (
        <p className="flex items-start gap-2 rounded-2xl border border-gold-500/30 bg-gold-500/5 px-4 py-3 text-xs text-cream-200">
          <CreditCard className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden />
          <span>
            Al continuar te llevamos a <b className="text-cream-50">Flow</b> para pagar{" "}
            <b className="text-cream-50">{CLP.format(precioClp)}</b>. Tu cupo queda reservado
            mientras completas el pago.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-ink-800 pt-6">
        <Button type="submit" size="lg" disabled={pendiente}>
          {pendiente && <LoaderCircle className="size-4 animate-spin" />}
          {esPagado ? `Pagar ${CLP.format(precioClp)}` : "Confirmar inscripción"}
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
