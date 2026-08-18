import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const lat = Number(request.nextUrl.searchParams.get("lat") ?? "");
    const lon = Number(request.nextUrl.searchParams.get("lon") ?? "");

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "Missing or invalid coordinates" }, { status: 400 });
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "18");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Memoraa/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Reverse geocoding failed" }, { status: 502 });
    }

    const data = (await response.json()) as { display_name?: string };

    return NextResponse.json({
      display_name: data.display_name ?? `${lat}, ${lon}`,
      lat,
      lon,
    });
  } catch (error) {
    console.error("Error reverse geocoding location:", error);
    return NextResponse.json({ error: "Unable to resolve address" }, { status: 500 });
  }
}
