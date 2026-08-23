"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MenuNavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
  /** Dibuja un divisor ANTES de este item, para agrupar. */
  isSeparator?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface UserProfileSidebarProps {
  user: UserProfile;
  navItems: MenuNavItem[];
  logoutItem: { icon: React.ReactNode; label: string; onClick?: () => void };
  /** Se dispara al elegir un link: lo usa el popover para cerrarse. */
  onNavigate?: () => void;
  className?: string;
}

const contenedorVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

/** Iniciales como respaldo cuando el proveedor no entrega avatar. */
function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Panel de cuenta del usuario.
 *
 * Adaptaciones respecto del snippet original:
 *  - <Link> de Next en vez de <a>: si no, cada item recarga la pagina entera.
 *  - motion/react (el proyecto ya trae `motion`), sin sumar framer-motion.
 *  - El avatar cae a iniciales si el proveedor no entrega foto.
 *  - hover en gris neutro y no en `accent`: el dorado se reserva para la
 *    accion principal, no para cada fila de un menu.
 *  - isSeparator dibuja un divisor real en vez de solo un hueco.
 *  - Respeta prefers-reduced-motion.
 */
export const UserProfileSidebar = React.forwardRef<HTMLDivElement, UserProfileSidebarProps>(
  ({ user, navItems, logoutItem, onNavigate, className }, ref) => {
    const reducir = useReducedMotion();

    return (
      <motion.div
        ref={ref}
        className={cn(
          "flex h-full w-full max-w-xs flex-col rounded-card border border-ink-700 bg-ink-900 p-3 text-cream-50 shadow-lift",
          className
        )}
        initial="hidden"
        animate="visible"
        variants={reducir ? undefined : contenedorVariants}
      >
        {/* Cabecera: identidad */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 p-2">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={48}
              height={48}
              className="size-11 shrink-0 rounded-full object-cover ring-1 ring-ink-700"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-b from-gold-400 to-gold-600 font-display text-lg text-ink-950"
            >
              {iniciales(user.name)}
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-cream-50">{user.name}</span>
            <span className="truncate text-xs text-cream-400">{user.email}</span>
          </span>
        </motion.div>

        <motion.div variants={itemVariants} className="my-3 border-t border-ink-800" />

        <nav aria-label="Menú de cuenta" className="flex-1 space-y-0.5">
          {navItems.map((item) => (
            <React.Fragment key={item.href}>
              {item.isSeparator && (
                <motion.div variants={itemVariants} className="my-2 border-t border-ink-800" />
              )}
              <motion.div variants={itemVariants}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className="group flex items-center rounded-xl px-3 py-2.5 text-sm text-cream-200 outline-none transition-colors hover:bg-ink-800 hover:text-cream-50 focus-visible:ring-[3px] focus-visible:ring-gold-500/40"
                >
                  <span className="mr-3 size-5 shrink-0 text-cream-400 transition-colors group-hover:text-gold-400">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                  <ChevronRight
                    aria-hidden
                    className="ml-auto size-4 shrink-0 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </Link>
              </motion.div>
            </React.Fragment>
          ))}
        </nav>

        <motion.div variants={itemVariants} className="mt-3 border-t border-ink-800 pt-3">
          <button
            type="button"
            onClick={logoutItem.onClick}
            className="group flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-red-400 outline-none transition-colors hover:bg-red-500/10 hover:text-red-300 focus-visible:ring-[3px] focus-visible:ring-red-500/40"
          >
            <span className="mr-3 size-5 shrink-0">{logoutItem.icon}</span>
            <span>{logoutItem.label}</span>
          </button>
        </motion.div>
      </motion.div>
    );
  }
);

UserProfileSidebar.displayName = "UserProfileSidebar";
