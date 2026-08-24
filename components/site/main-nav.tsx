"use client";

import { Home, CalendarDays, PlusCircle } from "lucide-react";
import { NavBar, type NavItem } from "@/components/ui/tubelight-navbar";

/** Solo rutas que existen: cada link nuevo entra cuando su pagina esta hecha. */
const LINKS: NavItem[] = [
  { name: "Inicio", url: "/", icon: Home },
  { name: "Eventos", url: "/eventos", icon: CalendarDays },
  { name: "Crear evento", url: "/crear-evento", icon: PlusCircle },
];

export function MainNav() {
  return (
    <div className="w-full border-y border-ink-800 bg-ink-950/80 py-4 backdrop-blur">
      <NavBar items={LINKS} />
    </div>
  );
}
