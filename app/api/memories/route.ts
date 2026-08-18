import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { encrypt } from "@/app/lib/encryption";
import { ensureAlbumPermission } from "@/app/lib/permissions";
import { ensureAlbumCover } from "@/app/lib/cover-generator";
import { parseMentionUsers } from "@/app/lib/mentions";
import { normalizeMood } from "@/app/lib/moods";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const withLocationOnly = request.nextUrl.searchParams.get("withLocation") === "true";

    const memories = await prisma.memory.findMany({
      where: {
        userId,
        ...(withLocationOnly ? {
          OR: [
            { location: { not: null } },
            { latitude: { not: null } },
            { longitude: { not: null } },
          ],
        } : {}),
      },
      orderBy: [{ memoryDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        memoryType: true,
        title: true,
        description: true,
        location: true,
        latitude: true,
        longitude: true,
        memoryDate: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: memories,
    });
  } catch (error) {
    console.error("Error fetching memories for map:", error);
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
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

    const userId = Number(session.user.id);
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
      albumId,
      memoryDate,
    } = await request.json();

    const normalizedMood = normalizeMood(mood);

    const normalizedContent = typeof content === "string" ? content : encryptedContent;

    if (!memoryType || !albumId || !normalizedContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const albumIdNumber = Number(albumId);
    const album = await prisma.album.findUnique({
      where: { id: albumIdNumber },
      select: { id: true, userId: true, name: true },
    });

    if (!album) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
    }

    const permissionCheck = await ensureAlbumPermission(userId, albumIdNumber, "add");
    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.error }, { status: permissionCheck.status });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { encryptionKey: true, username: true, fullName: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
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
      const collaborators = new Set<number>([
        album.userId,
        ...((await prisma.sharedAlbum.findMany({
          where: { albumId: Number(albumId), accepted: true },
          select: { userId: true },
        })).map((entry) => entry.userId)),
      ]);

      const finalMentionIds = validMentionedIds.filter((id) => collaborators.has(id));
      if (finalMentionIds.length > 0) {
        await prisma.memoryMention.createMany({
          data: finalMentionIds.map((mentionedUserId) => ({
            memoryId: memory.id,
            userId: mentionedUserId,
          })),
          skipDuplicates: true,
        });

        const mentionedUsers = await prisma.user.findMany({
          where: { id: { in: finalMentionIds } },
          select: { id: true, username: true, inAppNotificationsEnabled: true },
        });

        const notificationEntries = mentionedUsers
          .filter((mentionedUser) => mentionedUser.inAppNotificationsEnabled)
          .map((mentionedUser) => ({
            userId: mentionedUser.id,
            type: "mention",
            memoryId: memory.id,
            message: `${user.username || "Someone"} mentioned you in an album`,
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

    return NextResponse.json(
      {
        success: true,
        data: memory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating memory:", error);
    return NextResponse.json(
      { error: "Failed to create memory" },
      { status: 500 }
    );
  }
}
