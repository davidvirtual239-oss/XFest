import Link from "next/link";
import Image from "next/image";
import { MapPin, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CLP } from "@/lib/utils";

export type Proveedor = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  comuna: string | null;
  precio_desde: number | null;
  portada_url: string | null;
  distancia_km: number | null;
};

export function ProviderCard({ p }: { p: Proveedor }) {
  return (
    <Card className="group h-full ring-1 ring-cream-200 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift hover:ring-gold-500/40">
      <div className="relative aspect-4/3 overflow-hidden bg-cream-100">
        {p.portada_url ? (
          <Image
            src={p.portada_url}
            alt={p.nombre}
            fill
            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-brand group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-xs tracking-brand text-ink-500 uppercase">
            Sin imagen
          </div>
        )}

        {p.distancia_km !== null && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-ink-950/75 px-2.5 py-1 text-[10px] font-medium text-cream-50 backdrop-blur">
            <MapPin className="size-3" />
            {p.distancia_km} km
          </span>
        )}
      </div>

      <CardContent>
        <CardTitle className="normal-case tracking-normal">{p.nombre}</CardTitle>
        {p.comuna && (
          <p className="mt-1 text-[11px] tracking-brand text-gold-700 uppercase">{p.comuna}</p>
        )}
        {p.descripcion && (
          <CardDescription className="mt-2 line-clamp-2">{p.descripcion}</CardDescription>
        )}
        {p.precio_desde !== null && (
          <p className="mt-3 text-sm text-ink-900">
            <span className="text-xs text-muted-foreground">Desde </span>
            <span className="font-semibold">{CLP.format(p.precio_desde)}</span>
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href={`/proveedores/${p.slug}`}>
            Ver ficha
            <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
