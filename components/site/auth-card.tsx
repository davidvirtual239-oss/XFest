import Link from "next/link";
import Image from "next/image";
import { GoogleAuthButton } from "@/components/site/google-auth-button";

const COPY = {
  login: {
    titulo: "Bienvenido de vuelta",
    bajada: "Ingresa para crear y administrar tus eventos.",
    pie: "¿Primera vez aquí?",
    enlace: { href: "/registro", texto: "Crear cuenta" },
  },
  registro: {
    titulo: "Crea tu cuenta",
    bajada: "Regístrate en segundos y publica tu primer evento.",
    pie: "¿Ya tienes cuenta?",
    enlace: { href: "/login", texto: "Ingresar" },
  },
} as const;

export function AuthCard({ modo, next }: { modo: keyof typeof COPY; next: string }) {
  const copy = COPY[modo];
  const enlaceHref = `${copy.enlace.href}?next=${encodeURIComponent(next)}`;

  return (
    <main
      id="contenido"
      className="flex min-h-dvh items-center justify-center bg-ink-950 px-6 py-16"
    >
      <div className="w-full max-w-md animate-rise rounded-[var(--radius-card)] bg-ink-900 p-8 shadow-lift sm:p-10">
        <Link href="/" className="mx-auto block w-fit" aria-label="XFest — inicio">
          <Image
            src="/images/logo-xfest-ondark.png"
            alt=""
            width={128}
            height={128}
            className="size-16 object-contain"
          />
        </Link>

        <h1 className="mt-6 text-center font-display text-3xl text-cream-50">{copy.titulo}</h1>
        <p className="mt-2 text-center text-sm text-cream-400">{copy.bajada}</p>
        <div className="rule-gold mx-auto my-7 h-px w-16" aria-hidden />

        <GoogleAuthButton next={next} />

        <p className="mt-6 text-center text-xs text-cream-400">
          {copy.pie}{" "}
          <Link href={enlaceHref} className="text-gold-400 underline-offset-4 hover:underline">
            {copy.enlace.texto}
          </Link>
        </p>
      </div>
    </main>
  );
}
