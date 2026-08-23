"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
}

/**
 * Navbar "tubelight": pastilla con un tubo de luz que se desliza a la
 * pestana activa (layoutId de motion).
 *
 * Adaptaciones respecto del snippet original:
 *  - No es `fixed`: se renderiza en el flujo, donde estaba el nav previo.
 *    Fijarlo chocaba con el TopBar sticky y tapaba el hero.
 *  - La pestana activa sale de usePathname(), no de un useState en items[0]:
 *    entrando directo a /eventos el original encendia "Inicio".
 *  - El resplandor va ANTES del texto en el DOM en vez de usar -z-10, que
 *    lo mandaba detras del fondo de la pastilla y lo apagaba.
 *  - Respeta prefers-reduced-motion.
 */
export function NavBar({ items, className }: NavBarProps) {
  const pathname = usePathname();
  const reducirMovimiento = useReducedMotion();

  const activo =
    items.find((i) => i.url !== "/" && pathname.startsWith(i.url))?.name ??
    items.find((i) => i.url === pathname)?.name ??
    items[0]?.name;

  return (
    <nav aria-label="Navegación principal" className={cn("flex justify-center", className)}>
      <ul className="flex items-center gap-1 rounded-full border border-ink-800 bg-ink-900/70 p-1 shadow-soft backdrop-blur-lg">
        {items.map((item) => {
          const Icon = item.icon;
          const activa = activo === item.name;

          return (
            <li key={item.name}>
              <Link
                href={item.url}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "relative flex items-center justify-center rounded-full px-4 py-2.5 text-[11px] font-medium tracking-brand uppercase transition-colors duration-300 sm:px-6",
                  "outline-none focus-visible:ring-[3px] focus-visible:ring-gold-500/40",
                  activa ? "text-gold-300" : "text-cream-200 hover:text-cream-50"
                )}
              >
                {activa && (
                  <motion.span
                    layoutId="tubelight"
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-gold-500/10"
                    initial={false}
                    transition={
                      reducirMovimiento
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 300, damping: 30 }
                    }
                  >
                    {/* El "tubo" de luz: barra nitida + halos difuminados */}
                    <span className="absolute -top-px left-1/2 h-[3px] w-9 -translate-x-1/2 rounded-full bg-gold-400">
                      <span className="absolute -top-2 -left-2.5 h-6 w-14 rounded-full bg-gold-400/30 blur-md" />
                      <span className="absolute -top-1 h-5 w-9 rounded-full bg-gold-300/25 blur-md" />
                      <span className="absolute top-0 left-2.5 h-4 w-4 rounded-full bg-gold-300/35 blur-sm" />
                    </span>
                  </motion.span>
                )}

                <span className="relative hidden whitespace-nowrap md:inline">{item.name}</span>
                <span className="relative md:hidden">
                  <Icon size={18} strokeWidth={2.5} aria-hidden />
                  <span className="sr-only">{item.name}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
