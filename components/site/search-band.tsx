import { SearchBar } from "@/components/site/search-bar";

/**
 * Franja de busqueda bajo el nav. Vive aqui y no en el TopBar para que
 * el buscador tenga peso propio: es la accion principal de la home.
 */
export function SearchBand() {
  return (
    <section aria-label="Buscar eventos" className="border-b border-ink-800 bg-ink-950">
      <div className="mx-auto w-full max-w-2xl px-6 py-8 sm:py-10">
        <SearchBar />
      </div>
    </section>
  );
}
