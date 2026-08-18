import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { decrypt, encrypt } from "@/app/lib/encryption";
import { ensureAlbumPermission } from "@/app/lib/permissions";
import { ensureAlbumCover } from "@/app/lib/cover-generator";
import { parseMentionUsers } from "@/app/lib/mentions";
import { normalizeMood } from "@/app/lib/moods";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
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
        OR: [{ userId }, { sharedAlbums: { some: { userId, accepted: true } } }],
      },
    });

    if (!album) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
    }

    const permissionCheck = await ensureAlbumPermission(userId, albumId, "view");
    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    if (album.isArchived) {
      return NextResponse.json(
        { error: "Album is deleted" },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { encryptionKey: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const albumMemories = await prisma.albumMemory.findMany({
      where: { albumId },
      include: {
        memory: {
          include: {
            reactions: true,
          },
        },
      },
      orderBy: { memory: { createdAt: "desc" } },
    });

    const memories = albumMemories
      .map((am) => am.memory)
      .filter((memory) => !memory.isArchived)
      .map((memory) => {

      if (!memory.encryptedContent) {
        return { ...memory, encryptedContent: "" };
      }

      try {
        return {
          ...memory,
          encryptedContent: decrypt(memory.encryptedContent, user.encryptionKey),
        };
      } catch (error) {
        console.error("Error decrypting memory content:", error);
        return {
          ...memory,
          encryptedContent: "",
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
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        OR: [{ userId }, { sharedAlbums: { some: { userId, accepted: true } } }],
      },
    });

    if (!album) {
      console.error("Album not found or access denied", { albumId, userId });
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const permissionCheck = await ensureAlbumPermission(userId, albumId, "add");
    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const body = await request.json();
    const {
      memoryType,
      content,
      encryptedContent,
      encryptedFilePath,
      title,
      description,
      location,
      latitude,
      longitude,
      mood,
      memoryDate,
    } = body as Record<string, any>;

    const normalizedMood = normalizeMood(mood);

    const normalizedContent = typeof content === "string" ? content : encryptedContent;

    if (!memoryType || !albumId || !normalizedContent) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
        location: typeof location === "string" ? location.slice(0, 200) : null,
        latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
        longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
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

    const validMentionedIds = [...new Set(
      parseMentionUsers(normalizedContent)
        .map((entry) => Number(entry.id))
        .filter((id) => Number.isFinite(id) && id > 0 && id !== userId)
    )];

    if (validMentionedIds.length > 0) {
      const collaboratorIds = new Set<number>([
        album.userId,
        ...((await prisma.sharedAlbum.findMany({
          where: { albumId, accepted: true },
          select: { userId: true },
        })).map((entry) => entry.userId)),
      ]);

      const finalMentionIds = validMentionedIds.filter((id) => collaboratorIds.has(id));
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
          select: { id: true, fullName: true, username: true, inAppNotificationsEnabled: true },
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
        }
      }
    }

    if (memoryType === "photo" || memoryType === "video") {
      await ensureAlbumCover(Number(albumId));
    }

    return NextResponse.json({ success: true, data: memory }, { status: 201 });
  } catch (error) {
    console.error("Error creating memory in album route:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}
