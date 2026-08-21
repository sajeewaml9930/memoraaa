import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { decrypt } from "@/app/lib/encryption";
import { evaluateAdvancedQuery, looksLikeAdvancedSearch } from "@/app/lib/search-parser";
import { recordPopularSearch } from "@/app/lib/search-suggestions";

const MAX_RESULTS = 100;
const VALID_MEMORY_TYPES = new Set(["text", "photo", "video", "audio", "voice"]);

const parsePositiveInt = (value: string | null, fallback: number, max: number) => {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 1), max);
};

const parseCsvValues = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const parseTagIds = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((id) => Number.isFinite(id));

const formatDateForQuery = (value: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildSearchableText = (...parts: Array<string | null | undefined>) =>
  parts
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
    const mode = (request.nextUrl.searchParams.get("mode") ?? "simple").trim().toLowerCase();
    const albumIdParam = request.nextUrl.searchParams.get("albumId");
    const fromParam = request.nextUrl.searchParams.get("from");
    const toParam = request.nextUrl.searchParams.get("to");
    const typesParam = parseCsvValues(request.nextUrl.searchParams.get("types"));
    const moodParam = (request.nextUrl.searchParams.get("mood") ?? "").trim();
    const tagIdsParam = parseTagIds(request.nextUrl.searchParams.get("tagIds"));
    const page = parsePositiveInt(request.nextUrl.searchParams.get("page"), 1, 1000);
    const limit = parsePositiveInt(request.nextUrl.searchParams.get("limit"), 25, MAX_RESULTS);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { encryptionKey: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const accessibleAlbums = await prisma.album.findMany({
      where: {
        OR: [{ userId }, { sharedAlbums: { some: { userId, accepted: true } } }],
      },
      select: { id: true },
    });

    const accessibleAlbumIds = accessibleAlbums.map((album) => album.id);

    if (accessibleAlbumIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          total: 0,
          page,
          limit,
          query: q,
        },
      });
    }

    const requestedAlbumId = albumIdParam ? Number(albumIdParam) : null;

    if (requestedAlbumId !== null && !Number.isFinite(requestedAlbumId)) {
      return NextResponse.json({ error: "Invalid albumId" }, { status: 400 });
    }

    if (requestedAlbumId !== null && !accessibleAlbumIds.includes(requestedAlbumId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const fromDate = formatDateForQuery(fromParam);
    const toDate = formatDateForQuery(toParam);
    const normalizedTypes = Array.from(
      new Set(
        typesParam
          .map((type) => (type === "voice" ? "audio" : type))
          .filter((type) => VALID_MEMORY_TYPES.has(type))
      )
    );

    const memoryWhere: Prisma.MemoryWhereInput = {
      isArchived: false,
      ...(normalizedTypes.length > 0 ? { memoryType: { in: normalizedTypes } } : {}),
      ...(moodParam ? { mood: { equals: moodParam } } : {}),
      ...(tagIdsParam.length > 0 ? { tags: { some: { tagId: { in: tagIdsParam } } } } : {}),
      albums: {
        some: {
          albumId: {
            in: requestedAlbumId !== null ? [requestedAlbumId] : accessibleAlbumIds,
          },
        },
      },
      ...(fromDate || toDate
        ? {
            memoryDate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}),
            },
          }
        : {}),
    };

    const candidateMemories = await prisma.memory.findMany({
      where: memoryWhere,
      include: {
        albums: {
          include: {
            album: true,
          },
        },
      },
      orderBy: [
        { memoryDate: "desc" },
        { createdAt: "desc" },
      ],
      take: 500,
    });

    const normalizedQuery = q.toLowerCase();
    const isAdvancedMode = mode === "advanced" || looksLikeAdvancedSearch(q);

    const results = candidateMemories
      .map((memory) => {
        const album = memory.albums[0]?.album ?? null;
        const decryptedContent = memory.encryptedContent
          ? (() => {
              try {
                return decrypt(memory.encryptedContent, user.encryptionKey);
              } catch (error) {
                console.error("Error decrypting memory for search:", error);
                return "";
              }
            })()
          : "";

        const searchableText = buildSearchableText(
          memory.title,
          memory.description,
          memory.mood,
          decryptedContent
        );

        const matchesBasicQuery =
          normalizedQuery.length === 0 ||
          searchableText.toLowerCase().includes(normalizedQuery);

        let matchesAdvancedQuery = true;
        if (isAdvancedMode && q) {
          try {
            const allText = [
              decryptedContent,
              memory.title ?? "",
              memory.description ?? "",
              memory.mood ?? "",
            ].filter(Boolean);
            matchesAdvancedQuery = evaluateAdvancedQuery(q, allText);
          } catch (error) {
            throw new Error(
              error instanceof Error ? error.message : "Advanced search syntax is invalid."
            );
          }
        }

        if (!matchesBasicQuery || !matchesAdvancedQuery) {
          return null;
        }

        const snippetSource = decryptedContent || buildSearchableText(memory.title, memory.description);
        const snippet = snippetSource.length > 220 ? `${snippetSource.slice(0, 220).trim()}…` : snippetSource;

        return {
          id: memory.id,
          memoryType: memory.memoryType,
          title: memory.title,
          description: memory.description,
          mood: memory.mood,
          content: decryptedContent,
          snippet,
          memoryDate: memory.memoryDate,
          createdAt: memory.createdAt,
          albumId: album?.id ?? null,
          albumName: album?.name ?? "Unknown album",
          status: memory.status,
          isFavorite: memory.isFavorite,
          isPinned: memory.isPinned,
        };
      })
      .filter((memory): memory is NonNullable<typeof memory> => Boolean(memory));

    const total = results.length;
    const paginated = results.slice((page - 1) * limit, page * limit);

    if (q.trim()) {
      void recordPopularSearch(q);
    }

    return NextResponse.json({
      success: true,
      data: {
        results: paginated,
        total,
        page,
        limit,
        query: q,
      },
    });
  } catch (error) {
    console.error("Error searching memories:", error);
    return NextResponse.json({ error: "Failed to search memories" }, { status: 500 });
  }
}
