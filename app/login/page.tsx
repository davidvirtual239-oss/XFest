import type { Metadata } from "next";
import { AuthCard } from "@/components/site/auth-card";
import { rutaInternaSegura } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <AuthCard modo="login" next={rutaInternaSegura(next)} />;
}
