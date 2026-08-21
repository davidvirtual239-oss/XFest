import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-cream-200 bg-cream-100">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="font-display text-lg text-ink-900">Fiesta Maestra</p>
          <p className="text-xs text-muted-foreground">Chile · Pagos en CLP vía Flow</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] tracking-brand uppercase">
          <Link href="/terminos" className="text-ink-700 hover:text-gold-700">Términos</Link>
          <Link href="/privacidad" className="text-ink-700 hover:text-gold-700">Privacidad</Link>
          <Link href="/contacto" className="text-ink-700 hover:text-gold-700">Contacto</Link>
        </nav>
      </div>
    </footer>
  );
}
