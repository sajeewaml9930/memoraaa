import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { decrypt, encrypt } from "@/app/lib/encryption";
import { ensureAlbumPermission } from "@/app/lib/permissions";
import { ensureAlbumCover } from "@/app/lib/cover-generator";
import { parseMentionUsers } from "@/app/lib/mentions";
import { normalizeMood } from "@/app/lib/moods";
import { emitToAlbum, emitToUser } from "@/app/lib/socket";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const albumId = Number(id);
    const userId = Number(session.user.id);
    const requestedTypes = (request.nextUrl.searchParams.get("type") || "")
      .split(",")
      .map((type) => type.trim())
      .filter(Boolean);
    const requestedLimit = Number(
      request.nextUrl.searchParams.get("limit") || 0,
    );
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.floor(requestedLimit), 50)
        : undefined;

    if (!Number.isFinite(albumId)) {
      console.error("Invalid album id in route params:", { id });
      return NextResponse.json({ error: "Invalid album id" }, { status: 400 });
    }

    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        OR: [
          { userId },
          { sharedAlbums: { some: { userId, accepted: true } } },
        ],
      },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const permissionCheck = await ensureAlbumPermission(
      userId,
      albumId,
      "view",
    );
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status },
      );
    }

    if (album.isArchived) {
      return NextResponse.json({ error: "Album is deleted" }, { status: 404 });
    }

    const albumMemories = await prisma.albumMemory.findMany({
      where: {
        albumId,
        memory: {
          isArchived: false,
          ...(requestedTypes.length > 0
            ? { memoryType: { in: requestedTypes } }
            : {}),
        },
      },
      include: {
        memory: {
          include: {
            reactions: true,
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatar: true,
                encryptionKey: true,
              },
            },
          },
        },
      },
      orderBy: { memory: { createdAt: "desc" } },
      ...(limit ? { take: limit } : {}),
    });

    const memories = albumMemories
      .map((am) => am.memory)
      .filter((memory) => !memory.isArchived)
      .map((memory) => {
        const { user: memoryOwner, ...clientMemory } = memory;
        const sender = {
          id: memoryOwner.id,
          username: memoryOwner.username,
          fullName: memoryOwner.fullName,
          avatar: memoryOwner.avatar
            ? `/api/user/avatar/${memoryOwner.id}`
            : null,
        };

        if (!clientMemory.encryptedContent) {
          return { ...clientMemory, encryptedContent: "", sender };
        }

        try {
          return {
            ...clientMemory,
            encryptedContent: decrypt(
              clientMemory.encryptedContent,
              memoryOwner.encryptionKey,
            ),
            sender,
          };
        } catch (error) {
          console.error("Error decrypting album memory content:");
          console.error({
            albumId,
            memoryId: clientMemory.id,
            memoryType: clientMemory.memoryType,
            ownerId: clientMemory.userId,
            error,
          });
          return {
            ...clientMemory,
            encryptedContent: "",
            sender,
          };
        }
      });

    return NextResponse.json({
      success: true,
      data: memories,
    });
  } catch (error) {
    console.error("Error fetching memories:", error);
    return NextResponse.json(
      { error: "Failed to fetch memories" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const albumId = Number(id);
    const userId = Number(session.user.id);

    if (!Number.isFinite(albumId)) {
      console.error("Invalid album id in route params:", { id });
      return NextResponse.json({ error: "Invalid album id" }, { status: 400 });
    }

    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        OR: [
          { userId },
          { sharedAlbums: { some: { userId, accepted: true } } },
        ],
      },
    });

    if (!album) {
      console.error("Album not found or access denied", { albumId, userId });
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const permissionCheck = await ensureAlbumPermission(userId, albumId, "add");
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.status },
      );
    }

    const body = (await request.json()) as {
      memoryType?: string;
      clientId?: string;
      content?: string;
      encryptedContent?: string;
      encryptedFilePath?: string;
      title?: string;
      description?: string;
      mood?: string;
      memoryDate?: string;
    };
    const {
      memoryType,
      clientId,
      content,
      encryptedContent,
      encryptedFilePath,
      title,
      description,
      mood,
      memoryDate,
    } = body;

    const normalizedMood = normalizeMood(mood);

    const normalizedContent =
      typeof content === "string" ? content : encryptedContent;

    if (!memoryType || !albumId || !normalizedContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { encryptionKey: true, username: true, fullName: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const memory = await prisma.memory.create({
      data: {
        memoryType,
        encryptedContent: encrypt(normalizedContent, user.encryptionKey),
        encryptedFilePath,
        title,
        description,
        mood: normalizedMood,
        memoryDate: memoryDate ? new Date(memoryDate) : new Date(),
        userId,
        status: "ready",
      },
    });

    await prisma.albumMemory.create({
      data: {
        albumId: Number(albumId),
        memoryId: memory.id,
      },
    });

    const responseMemory = {
      ...memory,
      albumId,
      ...(typeof clientId === "string" ? { clientId } : {}),
      encryptedContent: normalizedContent,
    };

    try {
      emitToAlbum("new_memory", albumId, {
        albumId,
        memory: responseMemory,
      });
    } catch (error) {
      console.error("Error emitting new album memory:", {
        albumId,
        memoryId: memory.id,
        error,
      });
    }

    const validMentionedIds = [
      ...new Set(
        parseMentionUsers(normalizedContent)
          .map((entry) => Number(entry.id))
          .filter((id) => Number.isFinite(id) && id > 0 && id !== userId),
      ),
    ];

    if (validMentionedIds.length > 0) {
      const collaboratorIds = new Set<number>([
        album.userId,
        ...(
          await prisma.sharedAlbum.findMany({
            where: { albumId, accepted: true },
            select: { userId: true },
          })
        ).map((entry) => entry.userId),
      ]);

      const finalMentionIds = validMentionedIds.filter((id) =>
        collaboratorIds.has(id),
      );
      if (finalMentionIds.length > 0) {
        await prisma.memoryMention.createMany({
          data: finalMentionIds.map((mentionedUserId) => ({
            memoryId: memory.id,
            userId: mentionedUserId,
          })),
          skipDuplicates: true,
        });

        const mentionUsers = await prisma.user.findMany({
          where: { id: { in: finalMentionIds } },
          select: {
            id: true,
            fullName: true,
            username: true,
            inAppNotificationsEnabled: true,
          },
        });

        const notificationEntries = mentionUsers
          .filter((mentionedUser) => mentionedUser.inAppNotificationsEnabled)
          .map((mentionedUser) => ({
            userId: mentionedUser.id,
            type: "mention",
            memoryId: memory.id,
            message: `${user.username} mentioned you in ${album.name}`,
            read: false,
          }));

        if (notificationEntries.length > 0) {
          await prisma.notification.createMany({
            data: notificationEntries,
          });
          notificationEntries.forEach(({ userId }) =>
            emitToUser("notification", userId, { userId }),
          );
        }
      }
    }

    if (memoryType === "photo" || memoryType === "video") {
      await ensureAlbumCover(Number(albumId));
    }

    return NextResponse.json(
      { success: true, data: responseMemory },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating memory in album route:", error);
    return NextResponse.json(
      { error: "Failed to create memory" },
      { status: 500 },
    );
  }
}
