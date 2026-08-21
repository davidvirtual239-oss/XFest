"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/temas", label: "Temas" },
  { href: "/servicios", label: "Servicios" },
  { href: "/proveedores", label: "Proveedores" },
  { href: "/galeria", label: "Galería" },
  { href: "/contacto", label: "Contacto" },
  { href: "/nosotros", label: "Nosotros" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal" className="w-full border-y border-cream-200 bg-cream-50/80 backdrop-blur">
      <ul className="mx-auto flex max-w-6xl items-center justify-center gap-0 overflow-x-auto px-4 py-3 text-[11px] font-medium tracking-brand uppercase sm:text-xs">
        {LINKS.map((l, i) => {
          const active = pathname === l.href;
          return (
            <li key={l.href} className="flex items-center">
              {i > 0 && <span aria-hidden className="mx-3 h-3 w-px bg-cream-200 sm:mx-5" />}
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative whitespace-nowrap py-1 transition-colors duration-300",
                  "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-center after:scale-x-0 after:bg-gold-500 after:transition-transform after:duration-300 hover:after:scale-x-100",
                  active ? "text-gold-700 after:scale-x-100" : "text-ink-700 hover:text-ink-950"
                )}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
