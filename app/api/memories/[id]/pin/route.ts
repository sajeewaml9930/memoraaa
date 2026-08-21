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
    return { memory: null, allowed: false, albumIds: [] as number[] };
  }

  const isOwner = memory.userId === userId;
  const albumIds = memory.albums.map((albumMemory) => albumMemory.albumId);

  return {
    memory,
    allowed: isOwner,
    albumIds,
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

    let nextPinned: boolean | undefined;

    try {
      const body = await request.json();
      if (typeof body?.pinned === "boolean") {
        nextPinned = body.pinned;
      }
    } catch {
      nextPinned = undefined;
    }

    const { memory, allowed, albumIds } = await getMemoryWithPermission(
      memoryId,
      userId,
    );

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedPinned =
      nextPinned === undefined ? !memory.isPinned : nextPinned;

    const updatedMemory = await prisma.memory.update({
      where: { id: memoryId },
      data: {
        isPinned: resolvedPinned,
        pinnedAt: resolvedPinned ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    for (const albumId of albumIds) {
      emitToAlbum("memory_pinned", albumId, {
        albumId,
        memory: updatedMemory,
      });
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
    console.error("Error toggling memory pin status:", error);
    return NextResponse.json(
      { error: "Failed to toggle memory pin status" },
      { status: 500 },
    );
  }
}
