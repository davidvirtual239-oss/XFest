import type { Metadata } from "next";
import { AuthCard } from "@/components/site/auth-card";
import { rutaInternaSegura } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AuthCard modo="registro" next={rutaInternaSegura(next)} />;
}
