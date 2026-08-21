import Link from "next/link";
import Image from "next/image";
import { UserRound, Heart } from "lucide-react";
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
        <Link href="/" className="flex items-center gap-3" aria-label="Fiesta Maestra — inicio">
          <Image
            src="/images/logo-xfest.jpg"
            alt=""
            width={44}
            height={44}
            priority
            className="size-10 rounded-full object-cover sm:size-11"
          />
          <span className="hidden leading-none sm:block">
            <span className="block font-display text-lg text-ink-900">Fiesta</span>
            <span className="block text-[10px] tracking-brand text-gold-700 uppercase">Maestra</span>
          </span>
        </Link>

        {/* Buscador central */}
        <div className="mx-auto w-full max-w-xl">
          <SearchBar />
        </div>

        {/* Accesos de usuario */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
            <Link href="/favoritos" aria-label="Favoritos">
              <Heart className="size-4" />
            </Link>
          </Button>

          {user ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/panel">
                <UserRound className="size-4" />
                <span className="hidden sm:inline">Mi panel</span>
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
