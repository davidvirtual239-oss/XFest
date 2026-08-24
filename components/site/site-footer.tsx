import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-800 bg-ink-900">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="font-display text-xl tracking-tight text-cream-50">
            <span className="text-gold-600">X</span>Fest
          </p>
          <p className="text-xs text-muted-foreground">Chile · Pagos en CLP vía Flow</p>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] tracking-brand uppercase">
          <Link href="/terminos" className="text-cream-200 hover:text-gold-300">Términos</Link>
          <Link href="/privacidad" className="text-cream-200 hover:text-gold-300">Privacidad</Link>
          <Link href="/contacto" className="text-cream-200 hover:text-gold-300">Contacto</Link>
        </nav>
      </div>
    </footer>
  );
}
