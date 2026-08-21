import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

type NominatimItem = { display_name: string; lat: string; lon: string };

/**
 * Proxy a Nominatim: su politica de uso exige un User-Agent identificable,
 * que no se puede fijar desde el navegador.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json([]);

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0] ?? "anon";
  if (!(await checkRateLimit(`geocode:${ip}`, 20, 60))) {
    return NextResponse.json({ error: "Demasiadas busquedas." }, { status: 429 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "cl");
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", q);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "FiestaMaestra/1.0 (https://fiestamaestra.cl)",
      "Accept-Language": "es",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Servicio de direcciones no disponible." }, { status: 502 });
  }

  const items = (await res.json()) as NominatimItem[];
  return NextResponse.json(
    items.map((i) => ({
      label: i.display_name,
      lat: Number(i.lat),
      lng: Number(i.lon),
    }))
  );
}
