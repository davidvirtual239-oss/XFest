import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Server Component puro: sin JS en el cliente, LCP optimizado con priority. */
export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Imagen de fondo */}
      <Image
        src="https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1920&q=80"
        alt="Celebración con luces y guirnaldas"
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />

      {/* Overlay oscuro + vineta lateral para legibilidad del texto izquierdo */}
      <div className="absolute inset-0 -z-10 bg-ink-950/55" aria-hidden />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950/85 via-ink-950/45 to-transparent"
        aria-hidden
      />

      <div className="mx-auto flex min-h-[clamp(26rem,58vh,34rem)] max-w-7xl flex-col justify-center px-6 py-20 sm:px-10">
        <div className="max-w-xl animate-rise">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-ink-950/40 px-3 py-1 text-[10px] tracking-brand text-gold-300 uppercase backdrop-blur">
            <Sparkles className="size-3" />
            Organiza en minutos
          </p>

          <h1 className="text-balance-title font-display text-4xl leading-[1.08] text-cream-50 sm:text-5xl lg:text-6xl">
            Tu fiesta ideal,
            <span className="block text-gold-400">fácil y rápida</span>
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-cream-200/85 sm:text-base">
            Encuentra proveedores verificados cerca de ti, cotiza al instante y paga
            seguro en pesos chilenos. Todo en un solo lugar.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button size="lg" asChild>
              <Link href="/crear-evento">
                CREA TU EVENTO
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Link
              href="/eventos"
              className="text-xs tracking-brand text-cream-100 uppercase underline-offset-8 transition-colors hover:text-gold-300 hover:underline"
            >
              Ver eventos
            </Link>
          </div>
        </div>
      </div>

      <div className="rule-gold h-px w-full" aria-hidden />
    </section>
  );
}
