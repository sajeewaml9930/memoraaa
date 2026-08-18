import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

const normalizeSort = (value: string | null) => {
  switch (value) {
    case "name":
    case "name-asc":
      return "name-asc";
    case "name-desc":
      return "name-desc";
    case "date-asc":
    case "oldest":
      return "date-asc";
    case "custom":
      return "custom";
    case "date":
    case "date-desc":
    case "most-recent":
    default:
      return "date-desc";
  }
};

const normalizeOwnerFilter = (value: string | null): "all" | "owned" | "shared" => {
  switch (value) {
    case "owned":
      return "owned";
    case "shared":
      return "shared";
    case "all":
    default:
      return "all";
  }
};

const normalizePrivacyFilter = (value: string | null): "all" | "private" | "shared" => {
  switch (value) {
    case "private":
      return "private";
    case "shared":
      return "shared";
    case "all":
    default:
      return "all";
  }
};

const normalizeContentType = (value: string | null): "all" | "text" | "photo" | "video" | "audio" => {
  switch (value) {
    case "text":
    case "photo":
    case "video":
    case "audio":
      return value;
    case "all":
    default:
      return "all";
  }
};

const getOrderBy = (sort: string): Prisma.AlbumOrderByWithRelationInput[] => {
  switch (sort) {
    case "name-asc":
      return [{ name: "asc" }];
    case "name-desc":
      return [{ name: "desc" }];
    case "date-asc":
      return [{ updatedAt: "asc" }];
    case "custom":
    case "date-desc":
    default:
      return [
        { isPinned: "desc" },
        { pinnedAt: "desc" },
        { updatedAt: "desc" },
      ];
  }
};

const getContentTypeFilterValue = (filterType: "all" | "text" | "photo" | "video" | "audio") => {
  if (filterType === "all") {
    return undefined;
  }

  if (filterType === "audio") {
    return ["audio", "voice"];
  }

  return [filterType];
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = Number(session.user.id);
    const archivedOnly = request.nextUrl.searchParams.get("archived") === "true";
    const sort = normalizeSort(request.nextUrl.searchParams.get("sort"));
    const ownerFilter = normalizeOwnerFilter(
      request.nextUrl.searchParams.get("filterOwner") || request.nextUrl.searchParams.get("owner")
    );
    const privacyFilter = normalizePrivacyFilter(
      request.nextUrl.searchParams.get("filterPrivate") || request.nextUrl.searchParams.get("privacy")
    );
    const contentType = normalizeContentType(request.nextUrl.searchParams.get("filterType"));

    const contentTypeValues = getContentTypeFilterValue(contentType);

    const permissionParam = request.nextUrl.searchParams.get("permission");

    // Map permission param to allowed shared permission values
    const permissionMap: Record<string, string[]> = {
      view: ["view", "add", "edit", "admin"],
      add: ["add", "edit", "admin"],
      edit: ["edit", "admin"],
      admin: ["admin"],
    };

    const allowedPermissions = permissionParam ? permissionMap[permissionParam] ?? null : null;

    // Build owner/shared condition depending on whether a permission filter was requested
    const ownerOrSharedCondition: Prisma.AlbumWhereInput = allowedPermissions
      ? {
          OR: [
            { userId },
            { sharedAlbums: { some: { userId, accepted: true, permission: { in: allowedPermissions } } } },
          ],
        }
      : ownerFilter === "all"
        ? {
            OR: [
              { userId },
              { sharedAlbums: { some: { userId, accepted: true } } },
            ],
          }
        : ownerFilter === "owned"
          ? { userId }
          : { sharedAlbums: { some: { userId, accepted: true } } };

    const baseWhere: Prisma.AlbumWhereInput = {
      AND: [
        { isArchived: archivedOnly },
        privacyFilter === "all" ? {} : { isPrivate: privacyFilter === "private" },
        ownerOrSharedCondition,
        contentTypeValues
          ? {
              memories: {
                some: {
                  memory: {
                    memoryType: {
                      in: contentTypeValues,
                    },
                  },
                },
              },
            }
          : {},
      ],
    };

    const albums = await prisma.album.findMany({
      where: baseWhere,
      orderBy: getOrderBy(sort),
      include: {
        _count: {
          select: { memories: true },
        },
        sharedAlbums: {
          where: { userId, accepted: true },
          select: {
            permission: true,
            userId: true,
          },
        },
      },
    });

    const mutedAlbumIds = new Set(
      (await prisma.albumMute.findMany({
        where: { userId },
        select: { albumId: true },
      })).map((entry) => entry.albumId)
    );

    const response = albums.map((album) => {
      const { passcodeHash, _count, sharedAlbums, ...albumData } = album as typeof album & {
        passcodeHash?: string | null;
        sharedAlbums?: Array<{ permission: string; userId: number }>;
        _count?: { memories: number };
      };

      const membership = sharedAlbums?.[0];

      return {
        ...albumData,
        isLocked: Boolean(passcodeHash),
        memoryCount: _count?.memories ?? 0,
        role: album.userId === userId ? "owner" : "collaborator",
        permission: membership?.permission ?? undefined,
        isMuted: mutedAlbumIds.has(album.id),
      };
    });

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name, description, isPrivate } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Album name is required" },
        { status: 400 }
      );
    }

    const album = await prisma.album.create({
      data: {
        name,
        description,
        isPrivate: isPrivate !== false,
        userId: Number(session.user.id),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: album,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating album:", error);
    return NextResponse.json(
      { error: "Failed to create album" },
      { status: 500 }
    );
  }
}
