import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { emitToAlbum } from "@/app/lib/socket";

async function getMemoryWithPermission(memoryId: number, userId: number) {
  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
    include: {
      albums: true,
    },
  });

  if (!memory) {
    return { memory: null, allowed: false };
  }

  const isOwner = memory.userId === userId;
  const albumIds = memory.albums.map((albumMemory) => albumMemory.albumId);
  const ownedAlbumAccess = await prisma.album.findFirst({
    where: {
      id: { in: albumIds },
      userId,
    },
    select: { id: true },
  });
  const sharedAlbumAccess = await prisma.sharedAlbum.findFirst({
    where: {
      albumId: { in: albumIds },
      userId,
      accepted: true,
      permission: { in: ["edit", "admin", "view"] },
    },
  });

  return {
    memory,
    allowed: isOwner || Boolean(ownedAlbumAccess) || Boolean(sharedAlbumAccess),
  };
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
    const memoryId = Number(id);
    const userId = Number(session.user.id);

    if (!Number.isFinite(memoryId)) {
      return NextResponse.json({ error: "Invalid memory id" }, { status: 400 });
    }

    const { memory, allowed } = await getMemoryWithPermission(memoryId, userId);

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedMemory = await prisma.memory.update({
      where: { id: memoryId },
      data: {
        isFavorite: !memory.isFavorite,
        updatedAt: new Date(),
      },
    });

    const albumIds = memory.albums.map((albumMemory) => albumMemory.albumId);
    for (const albumId of albumIds) {
      emitToAlbum("memory_updated", albumId, {
        albumId,
        memory: updatedMemory,
      });
    }

    return NextResponse.json(
      { success: true, data: updatedMemory },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error toggling favorite memory:", error);
    return NextResponse.json(
      { error: "Failed to toggle favorite memory" },
      { status: 500 },
    );
  }
}
