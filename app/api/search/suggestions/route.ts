import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { normalizeSearchQuery } from "@/app/lib/search-suggestions";

const MAX_SUGGESTIONS = 10;
const MAX_RICH_SUGGESTIONS_PER_TYPE = 4;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const rawQuery = (request.nextUrl.searchParams.get("q") ?? "").trim();
    const normalizedQuery = normalizeSearchQuery(rawQuery);
    const isRichMode = request.nextUrl.searchParams.get("mode") === "rich";

    if (isRichMode) {
      if (normalizedQuery.length < 2) {
        return NextResponse.json({ success: true, data: [] });
      }

      const [albums, memories, tags] = await Promise.all([
        prisma.album.findMany({
          where: {
            isArchived: false,
            name: { contains: normalizedQuery },
            OR: [{ userId }, { sharedAlbums: { some: { userId, accepted: true } } }],
          },
          select: { id: true, name: true },
          orderBy: { updatedAt: "desc" },
          take: MAX_RICH_SUGGESTIONS_PER_TYPE,
        }),
        prisma.memory.findMany({
          where: {
            isArchived: false,
            OR: [
              { title: { contains: normalizedQuery } },
              { description: { contains: normalizedQuery } },
            ],
            albums: {
              some: {
                album: {
                  OR: [{ userId }, { sharedAlbums: { some: { userId, accepted: true } } }],
                },
              },
            },
          },
          select: {
            id: true,
            title: true,
            description: true,
            albums: { select: { albumId: true, album: { select: { name: true } } }, take: 1 },
          },
          orderBy: { memoryDate: "desc" },
          take: MAX_RICH_SUGGESTIONS_PER_TYPE,
        }),
        prisma.tag.findMany({
          where: { userId, name: { contains: normalizedQuery } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
          take: MAX_RICH_SUGGESTIONS_PER_TYPE,
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: [
          ...albums.map((album) => ({ type: "album" as const, id: album.id, label: album.name, detail: "Album" })),
          ...memories.map((memory) => ({
            type: "memory" as const,
            id: memory.id,
            albumId: memory.albums[0]?.albumId ?? null,
            label: memory.title || memory.description || "Untitled memory",
            detail: memory.albums[0]?.album.name ?? "Memory",
          })),
          ...tags.map((tag) => ({ type: "tag" as const, id: tag.id, label: tag.name, detail: "Tag" })),
        ].slice(0, MAX_SUGGESTIONS),
      });
    }

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
