import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
      { protocol: "https" as const, hostname: "images.unsplash.com" },
      // Avatares de Google (OAuth); sin esto next/image los rechaza
      { protocol: "https" as const, hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    // Server Actions solo aceptan peticiones desde estos origenes (anti-CSRF)
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:3001", "xfest.cl"],
      bodySizeLimit: "10mb",   // la portada del evento viaja dentro del FormData
    },
  },
};

export default nextConfig;
