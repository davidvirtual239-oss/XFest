"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function GoogleAuthButton({ next }: { next: string }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingresar() {
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError("No se pudo conectar con Google. Intenta de nuevo.");
      setCargando(false);
    }
  }

  return (
    <>
      <Button size="lg" className="w-full" onClick={ingresar} disabled={cargando}>
        {cargando ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path
              fill="currentColor"
              d="M12 11v2.8h4.6c-.2 1.2-1.4 3.5-4.6 3.5-2.8 0-5-2.3-5-5.1s2.2-5.1 5-5.1c1.6 0 2.6.7 3.2 1.2l2.2-2.1C15.9 4.9 14.1 4 12 4c-4.4 0-8 3.6-8 8s3.6 8 8 8c4.6 0 7.7-3.2 7.7-7.8 0-.5 0-.9-.1-1.2H12z"
            />
          </svg>
        )}
        Continuar con Google
      </Button>

      <p
        role="status"
        aria-live="polite"
        className={`mt-3 text-center text-xs text-red-700 transition-opacity ${error ? "opacity-100" : "opacity-0"}`}
      >
        {error ?? " "}
      </p>
    </>
  );
}
