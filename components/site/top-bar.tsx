import Link from "next/link";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { SearchBar } from "@/components/site/search-bar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

/** Server Component: lee la sesion en el servidor, sin flash de "iniciar sesion". */
export async function TopBar() {
  // Durante el MVP la landing debe renderizar aunque Supabase aun no este conectado.
  let user = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      user = (await supabase.auth.getUser()).data.user;
    } catch {
      user = null;
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cream-200 bg-cream-50/90 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 sm:gap-8 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          aria-label="XFest — inicio"
          className="group flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-gold-500/40"
        >
          <Image
            src="/images/logo-xfest.png"
            alt=""
            width={96}
            height={96}
            priority
            className="size-11 object-contain transition-transform duration-500 ease-brand group-hover:scale-105 sm:size-12"
          />
          <span className="hidden font-display text-2xl leading-none tracking-tight text-ink-900 sm:block">
            <span className="text-gold-600">X</span>Fest
          </span>
        </Link>

        {/* Buscador central */}
        <div className="mx-auto w-full max-w-xl">
          <SearchBar />
        </div>

        {/* Accesos de usuario */}
        <div className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/crear-evento">
                <UserRound className="size-4" />
                <span className="hidden sm:inline">Crear evento</span>
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/login">Ingresar</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/registro">
                  <UserRound className="size-4" />
                  <span className="hidden sm:inline">Crear cuenta</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
