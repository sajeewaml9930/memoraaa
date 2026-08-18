import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { normalizeSearchQuery } from "@/app/lib/search-suggestions";

const MAX_SUGGESTIONS = 10;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const rawQuery = (request.nextUrl.searchParams.get("q") ?? "").trim();
    const normalizedQuery = normalizeSearchQuery(rawQuery);

    if (!normalizedQuery) {
      const popular = await prisma.popularSearch.findMany({
        orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
        take: MAX_SUGGESTIONS,
        select: { query: true },
      });

      return NextResponse.json({ success: true, data: popular.map((item) => item.query) });
    }

    if (normalizedQuery.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const [historyMatches, popularMatches] = await Promise.all([
      prisma.searchHistory.findMany({
        where: {
          userId,
          query: {
            startsWith: normalizedQuery,
          },
        },
        select: { query: true },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      prisma.popularSearch.findMany({
        where: {
          query: {
            startsWith: normalizedQuery,
          },
        },
        orderBy: [{ count: "desc" }, { updatedAt: "desc" }],
        take: 25,
        select: { query: true },
      }),
    ]);

    const seen = new Set<string>();
    const suggestions: string[] = [];

    for (const item of historyMatches) {
      const value = normalizeSearchQuery(item.query);
      if (value && !seen.has(value)) {
        seen.add(value);
        suggestions.push(value);
      }
    }

    for (const item of popularMatches) {
      const value = normalizeSearchQuery(item.query);
      if (value && !seen.has(value)) {
        seen.add(value);
        suggestions.push(value);
      }
    }

    return NextResponse.json({
      success: true,
      data: suggestions.slice(0, MAX_SUGGESTIONS),
    });
  } catch (error) {
    console.error("Error fetching search suggestions:", error);
    return NextResponse.json({ error: "Failed to fetch search suggestions" }, { status: 500 });
  }
}
