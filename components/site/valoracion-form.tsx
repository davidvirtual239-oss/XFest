"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Star } from "lucide-react";
import { guardarValoracion, type ValoracionState } from "@/app/actions/valoraciones";
import { EstrellasInput } from "@/components/ui/estrellas";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const inicial: ValoracionState = { ok: false };

function Enviar({ yaValoro }: { yaValoro: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {yaValoro ? "Actualizar valoración" : "Publicar valoración"}
    </Button>
  );
}

export function ValoracionForm({
  eventoId,
  actual,
}: {
  eventoId: string;
  actual: { estrellas_evento: number; estrellas_organizador: number; comentario: string | null } | null;
}) {
  const [state, formAction] = useActionState(guardarValoracion, inicial);

  return (
    <form action={formAction} className="rounded-card border border-ink-800 bg-ink-900 p-6 sm:p-8">
      <input type="hidden" name="eventoId" value={eventoId} />

      <div className="mb-6 flex items-center gap-2">
        <Star className="size-4 text-gold-400" aria-hidden />
        <h3 className="font-display text-xl text-cream-50">
          {actual ? "Tu valoración" : "¿Cómo estuvo?"}
        </h3>
      </div>

      <div className="flex flex-wrap gap-8">
        <EstrellasInput
          name="estrellasEvento"
          label="La fiesta"
          defaultValue={actual?.estrellas_evento ?? 0}
        />
        <EstrellasInput
          name="estrellasOrganizador"
          label="El organizador"
          defaultValue={actual?.estrellas_organizador ?? 0}
        />
      </div>

      <div className="mt-6">
        <label htmlFor="comentario" className="mb-2 block text-[11px] tracking-brand text-cream-400 uppercase">
          Comentario <span className="normal-case">(opcional)</span>
        </label>
        <Textarea
          id="comentario"
          name="comentario"
          maxLength={500}
          defaultValue={actual?.comentario ?? ""}
          placeholder="¿Qué destacarías? ¿Qué mejorarías?"
        />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Enviar yaValoro={Boolean(actual)} />
        <p role="status" aria-live="polite" className="text-xs">
          {state.error && <span className="text-red-400">{state.error}</span>}
          {state.ok && <span className="text-gold-300">Gracias, tu valoración quedó publicada.</span>}
        </p>
      </div>
    </form>
  );
}
