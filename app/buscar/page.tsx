import Link from "next/link";
import { Suspense } from "react";
import { SearchX, TriangleAlert, Settings2 } from "lucide-react";
import { TopBar } from "@/components/site/top-bar";
import { MainNav } from "@/components/site/main-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { ProviderCard, type Proveedor } from "@/components/site/provider-card";
import { Button } from "@/components/ui/button";
import { buscarProveedores } from "@/app/actions/search";
import { searchSchema, CATEGORIAS } from "@/lib/validation/search";

export const metadata = { title: "Resultados de búsqueda" };

const ETIQUETAS: Record<(typeof CATEGORIAS)[number], string> = {
  infantiles: "Fiestas Infantiles",
  corporativos: "Eventos Corporativos",
  bodas: "Bodas y Aniversarios",
  graduaciones: "Graduaciones",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BuscarPage({ searchParams }: Props) {
  const raw = await searchParams;

  // Mismo schema que el Server Action: la URL es la unica fuente de estado.
  const parsed = searchSchema.safeParse(raw);
  const params = parsed.success ? parsed.data : searchSchema.parse({});

  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-cream-200 bg-cream-50" />}>
        <TopBar />
      </Suspense>
      <MainNav />

      <main id="contenido" className="mx-auto min-h-[60vh] max-w-7xl px-6 py-12 sm:px-10">
        <header className="mb-8">
          <p className="text-[10px] tracking-brand text-gold-700 uppercase">Resultados</p>
          <h1 className="mt-2 font-display text-3xl text-ink-900 sm:text-4xl">
            {params.q
              ? `“${params.q}”`
              : params.categoria
                ? ETIQUETAS[params.categoria]
                : "Todos los proveedores"}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {params.categoria && params.q && (
              <span className="rounded-full bg-cream-100 px-3 py-1">
                {ETIQUETAS[params.categoria]}
              </span>
            )}
            {params.lat != null && params.lng != null && (
              <span className="rounded-full bg-cream-100 px-3 py-1">
                Radio {params.radioKm} km
              </span>
            )}
          </div>

          <div className="rule-gold mt-6 h-px w-24" aria-hidden />
        </header>

        <Suspense key={JSON.stringify(params)} fallback={<GridSkeleton />}>
          <Resultados params={params} />
        </Suspense>
      </main>

      <SiteFooter />
    </>
  );
}

async function Resultados({ params }: { params: ReturnType<typeof searchSchema.parse> }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://") ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes("xxxxx")) {
    return (
      <Aviso
        icono={<Settings2 className="size-5" />}
        titulo="Supabase aún no está conectado"
        detalle="Completa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local y reinicia el servidor."
      />
    );
  }

  let resultados: Proveedor[];
  try {
    resultados = (await buscarProveedores(params)) as Proveedor[];
  } catch (e) {
    console.error("[buscar]", e);
    return (
      <Aviso
        icono={<TriangleAlert className="size-5" />}
        titulo="No pudimos completar la búsqueda"
        detalle="Vuelve a intentarlo en unos segundos."
      />
    );
  }

  if (resultados.length === 0) {
    return (
      <Aviso
        icono={<SearchX className="size-5" />}
        titulo="Sin resultados por ahora"
        detalle="Prueba con otra palabra, amplía el radio de búsqueda o explora por categoría."
        accion={
          <Button variant="outline" size="sm" asChild>
            <Link href="/#categorias">Ver categorías</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <p className="mb-6 text-xs text-muted-foreground">
        {resultados.length} {resultados.length === 1 ? "proveedor" : "proveedores"}
      </p>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {resultados.map((p, i) => (
          <li key={p.id} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <ProviderCard p={p} />
          </li>
        ))}
      </ul>
    </>
  );
}

function Aviso({
  icono,
  titulo,
  detalle,
  accion,
}: {
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
  accion?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md rounded-card border border-cream-200 bg-white/60 px-8 py-14 text-center">
      <div className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-cream-100 text-gold-700">
        {icono}
      </div>
      <p className="font-display text-xl text-ink-900">{titulo}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detalle}</p>
      {accion && <div className="mt-6 flex justify-center">{accion}</div>}
    </div>
  );
}

function GridSkeleton() {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="overflow-hidden rounded-card ring-1 ring-cream-200">
          <div className="aspect-4/3 animate-pulse bg-cream-100" />
          <div className="space-y-3 px-6 py-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-cream-100" />
            <div className="h-3 w-full animate-pulse rounded bg-cream-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-cream-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
