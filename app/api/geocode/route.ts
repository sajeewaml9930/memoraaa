import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim();

    if (!query) {
      return NextResponse.json({ error: "Missing search query" }, { status: 400 });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Memoraa/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    const data = (await response.json()) as Array<{
      display_name?: string;
      lat?: string;
      lon?: string;
      type?: string;
      class?: string;
    }>;

    const results = data
      .filter((item) => typeof item.display_name === "string" && item.lat && item.lon)
      .map((item) => ({
        display_name: item.display_name,
        lat: Number(item.lat),
        lon: Number(item.lon),
        type: item.type ?? "location",
        className: item.class ?? "place",
      }))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error geocoding location:", error);
    return NextResponse.json({ error: "Unable to search locations" }, { status: 500 });
  }
}
