"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { UserRound, CalendarCheck, PlusCircle, Compass, LogOut, ChevronDown } from "lucide-react";
import { UserProfileSidebar, type MenuNavItem, type UserProfile } from "@/components/ui/menu";
import { cerrarSesion } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

/** Solo rutas que existen: un menu que lleva a 404 es peor que no tenerlo. */
const ITEMS: MenuNavItem[] = [
  { label: "Mi perfil", href: "/perfil", icon: <UserRound className="h-full w-full" /> },
  { label: "Mis eventos", href: "/mis-eventos", icon: <CalendarCheck className="h-full w-full" /> },
  { label: "Crear evento", href: "/crear-evento", icon: <PlusCircle className="h-full w-full" /> },
  {
    label: "Explorar eventos",
    href: "/eventos",
    icon: <Compass className="h-full w-full" />,
    isSeparator: true,
  },
];

export function UserMenu({ user }: { user: UserProfile }) {
  const [abierto, setAbierto] = useState(false);
  const [saliendo, iniciarSalida] = useTransition();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const reducir = useReducedMotion();

  // Cerrar al cambiar de ruta
  useEffect(() => setAbierto(false), [pathname]);

  // Escape devuelve el foco al disparador; click fuera solo cierra
  useEffect(() => {
    if (!abierto) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAbierto(false);
        disparadorRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [abierto]);

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={disparadorRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="true"
        aria-controls="panel-cuenta"
        className={cn(
          "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 transition-colors outline-none",
          "focus-visible:ring-[3px] focus-visible:ring-gold-500/40",
          abierto
            ? "border-gold-500/50 bg-ink-800"
            : "border-ink-700 hover:border-ink-600 hover:bg-ink-800"
        )}
      >
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt=""
            width={64}
            height={64}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-full bg-gradient-to-b from-gold-400 to-gold-600 text-xs font-semibold text-ink-950"
          >
            {user.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-28 truncate text-sm text-cream-100 sm:inline">
          {user.name}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 text-cream-400 transition-transform duration-300",
            abierto && "rotate-180"
          )}
        />
        <span className="sr-only">Menú de cuenta</span>
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            id="panel-cuenta"
            initial={reducir ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducir ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-2 w-72 origin-top-right"
          >
            <UserProfileSidebar
              user={user}
              navItems={ITEMS}
              onNavigate={() => setAbierto(false)}
              logoutItem={{
                label: saliendo ? "Cerrando sesión…" : "Cerrar sesión",
                icon: <LogOut className="h-full w-full" />,
                onClick: () => iniciarSalida(() => void cerrarSesion()),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
