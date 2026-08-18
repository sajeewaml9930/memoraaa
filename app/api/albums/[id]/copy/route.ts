import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

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

    if (!Number.isFinite(albumId) || albumId <= 0) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 });
    }

    const originalAlbum = await prisma.album.findUnique({
      where: { id: albumId },
      include: {
        memories: {
          include: {
            memory: true,
          },
        },
      },
    });

    if (!originalAlbum) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    if (originalAlbum.userId !== userId) {
      return NextResponse.json({ error: "Only album owners can copy albums" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedName = typeof body?.name === "string" ? body.name.trim() : "";
    const includeMemories = body?.includeMemories !== false;

    const copiedAlbumName = requestedName || `Copy of ${originalAlbum.name}`;

    const newAlbum = await prisma.album.create({
      data: {
        name: copiedAlbumName.slice(0, 100),
        description: originalAlbum.description ?? null,
        coverPhoto: originalAlbum.coverPhoto ?? null,
        isPrivate: originalAlbum.isPrivate,
        isArchived: false,
        isPinned: false,
        passcodeHash: null,
        passcodeTimeout: 5,
        userId,
      },
    });

    if (includeMemories && originalAlbum.memories.length > 0) {
      for (const albumMemory of originalAlbum.memories) {
        const memory = albumMemory.memory;

        const createdMemory = await prisma.memory.create({
          data: {
            memoryType: memory.memoryType,
            encryptedContent: memory.encryptedContent,
            encryptedFilePath: memory.encryptedFilePath,
            thumbnailPath: memory.thumbnailPath,
            duration: memory.duration,
            title: memory.title,
            description: memory.description,
            location: memory.location,
            latitude: memory.latitude,
            longitude: memory.longitude,
            mood: memory.mood,
            isFavorite: memory.isFavorite,
            isPinned: memory.isPinned,
            isArchived: memory.isArchived,
            isStory: false,
            expiresAt: null,
            viewCount: memory.viewCount,
            memoryDate: memory.memoryDate,
            userId,
            forwardedFromId: memory.forwardedFromId,
            status: memory.status,
          },
        });

        await prisma.albumMemory.create({
          data: {
            albumId: newAlbum.id,
            memoryId: createdMemory.id,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: newAlbum,
    }, { status: 201 });
  } catch (error) {
    console.error("Error copying album:", error);
    return NextResponse.json({ error: "Failed to copy album" }, { status: 500 });
  }
}
