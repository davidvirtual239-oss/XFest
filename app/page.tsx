import { Suspense } from "react";
import { TopBar } from "@/components/site/top-bar";
import { MainNav } from "@/components/site/main-nav";
import { SearchBand } from "@/components/site/search-band";
import { Hero } from "@/components/site/hero";
import { UpcomingEvents } from "@/components/site/upcoming-events";
import { SiteFooter } from "@/components/site/site-footer";

/**
 * Landing = Server Component.
 * Solo el <SearchBar/> (dentro de SearchBand) y <MainNav/> son
 * Client Components (islands).
 * TopBar va en Suspense porque lee la sesion (dynamic); el Hero se
 * renderiza estatico e inmediato -> mejor LCP.
 */
export default function HomePage() {
  return (
    <>
      <Suspense fallback={<div className="h-[68px] border-b border-ink-800 bg-ink-950" />}>
        <TopBar />
      </Suspense>

      <main id="contenido">
        <Hero />
        <MainNav />
        <SearchBand />
        <UpcomingEvents />
      </main>

      <SiteFooter />
    </>
  );
}
