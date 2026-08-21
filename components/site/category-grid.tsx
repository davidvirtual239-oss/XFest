import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Categoria } from "@/lib/validation/search";

type Item = {
  slug: Categoria;
  titulo: string;
  bajada: string;
  img: string;
};

/**
 * Datos estaticos en el MVP. Migracion futura: SELECT sobre public.categorias
 * dentro de este mismo Server Component (fetch en el servidor, cero JS extra).
 */
const CATEGORIAS: Item[] = [
  {
    slug: "infantiles",
    titulo: "Fiestas Infantiles",
    bajada: "Temáticas, animación, cotillón y torta.",
    img: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80",
  },
  {
    slug: "corporativos",
    titulo: "Eventos Corporativos",
    bajada: "Lanzamientos, fin de año y team building.",
    img: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80",
  },
  {
    slug: "bodas",
    titulo: "Bodas y Aniversarios",
    bajada: "Banquetería, decoración y música en vivo.",
    img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
  },
  {
    slug: "graduaciones",
    titulo: "Graduaciones",
    bajada: "Licenciaturas, gala y fiestas de egreso.",
    img: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
  },
];

export function CategoryGrid() {
  return (
    <section id="categorias" className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-20">
      <header className="mb-10 text-center">
        <p className="text-[10px] tracking-brand text-gold-700 uppercase">Categorías</p>
        <h2 className="mt-3 font-display text-3xl text-ink-900 sm:text-4xl">
          ¿Qué estás celebrando?
        </h2>
        <div className="rule-gold mx-auto mt-5 h-px w-24" aria-hidden />
      </header>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIAS.map((c, i) => (
          <li key={c.slug} className="animate-rise" style={{ animationDelay: `${i * 90}ms` }}>
            <Card className="group h-full ring-1 ring-cream-200 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift hover:ring-gold-500/40">
              <div className="relative aspect-4/3 overflow-hidden">
                <Image
                  src={c.img}
                  alt={c.titulo}
                  fill
                  sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-brand group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-ink-950/45 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden
                />
              </div>

              <CardContent className="text-center">
                <CardTitle>{c.titulo}</CardTitle>
                <CardDescription className="mt-2">{c.bajada}</CardDescription>
              </CardContent>

              <CardFooter className="flex justify-center">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/buscar?categoria=${c.slug}`}>
                    Explorar
                    <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
