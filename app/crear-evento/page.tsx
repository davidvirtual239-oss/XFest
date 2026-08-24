import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/site/top-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { CrearEventoForm } from "@/components/site/crear-evento-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Crea tu evento" };

export default async function CrearEventoPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/crear-evento");

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido" className="bg-ink-950">
        <div className="mx-auto max-w-3xl px-6 py-14 sm:px-10 sm:py-20">
          <header className="mb-10 text-center">
            <p className="text-[10px] tracking-brand text-gold-400 uppercase">Nuevo evento</p>
            <h1 className="mt-3 font-display text-3xl text-cream-50 sm:text-4xl">
              Crea tu evento
            </h1>
            <p className="mt-3 text-sm text-cream-400">
              Se publicará de inmediato en la portada para que todos puedan verlo.
            </p>
            <div className="rule-gold mx-auto mt-5 h-px w-24" aria-hidden />
          </header>

          <div className="animate-rise rounded-[var(--radius-card)] bg-ink-900 p-6 shadow-soft sm:p-10">
            <CrearEventoForm />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
