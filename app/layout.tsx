import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "XFest — Tu fiesta ideal, fácil y rápida",
    template: "%s · XFest",
  },
  description:
    "Organiza fiestas infantiles, eventos corporativos, bodas y graduaciones con proveedores verificados en Chile.",
  openGraph: { locale: "es_CL", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-gold-500 focus:px-4 focus:py-2 focus:text-sm"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
