import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

const MAX_RECENT_SEARCHES = 50;

const normalizeFilters = (filters: unknown) => {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters as Record<string, unknown>).filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (typeof value === "string") {
          const trimmed = value.trim();
          return [key, trimmed];
        }

        return [key, value];
      })
      .filter(([, value]) => {
        if (typeof value === "string") {
          return value.length > 0;
        }

        return true;
      })
  );
};

export async function GET() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const searches = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        query: true,
        filters: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: searches });
  } catch (error) {
    console.error("Error fetching recent searches:", error);
    return NextResponse.json({ error: "Failed to fetch recent searches" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const body = await request.json().catch(() => ({}));
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const filters = normalizeFilters(body?.filters ?? {});

    const created = await prisma.searchHistory.create({
      data: {
        userId,
        query,
        filters,
      },
    });

    const totalCount = await prisma.searchHistory.count({ where: { userId } });

    if (totalCount > MAX_RECENT_SEARCHES) {
      const oldestSearches = await prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        take: totalCount - MAX_RECENT_SEARCHES,
        select: { id: true },
      });

      if (oldestSearches.length > 0) {
        await prisma.searchHistory.deleteMany({
          where: {
            id: { in: oldestSearches.map((search) => search.id) },
            userId,
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("Error saving recent search:", error);
    return NextResponse.json({ error: "Failed to save recent search" }, { status: 500 });
  }
}
