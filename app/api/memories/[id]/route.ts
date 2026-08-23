import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { encrypt } from "@/app/lib/encryption";
import { emitToAlbum } from "@/app/lib/socket";

async function getMemoryWithPermission(memoryId: number, userId: number) {
  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
    include: {
      albums: true,
      user: {
        select: {
          encryptionKey: true,
        },
      },
    },
  });

  if (!memory) {
    return { memory: null, allowed: false };
  }

  const isOwner = memory.userId === userId;
  return {
    memory,
    allowed: isOwner,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { id } = await params;
    const memoryId = Number(id);

    if (!Number.isFinite(memoryId)) {
      return NextResponse.json({ error: "Invalid memory id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { content, memoryDate, isFavorite, isPinned } = body ?? {};

    const { memory, allowed } = await getMemoryWithPermission(memoryId, userId);

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (typeof isFavorite === "boolean") {
      const updatedMemory = await prisma.memory.update({
        where: { id: memoryId },
        data: {
          isFavorite,
          updatedAt: new Date(),
        },
      });

      for (const album of memory.albums) {
        emitToAlbum("memory_updated", album.albumId, {
          albumId: album.albumId,
          memory: updatedMemory,
        });
      }

      return NextResponse.json(
        { success: true, data: updatedMemory },
        { status: 200 },
      );
    }

    if (typeof isPinned === "boolean") {
      const updatedMemory = await prisma.memory.update({
        where: { id: memoryId },
        data: {
          isPinned,
          pinnedAt: isPinned ? new Date() : null,
          updatedAt: new Date(),
        },
      });

      for (const album of memory.albums) {
        emitToAlbum("memory_pinned", album.albumId, {
          albumId: album.albumId,
          memory: updatedMemory,
        });
        emitToAlbum("memory_updated", album.albumId, {
          albumId: album.albumId,
          memory: updatedMemory,
        });
      }

      return NextResponse.json(
        { success: true, data: updatedMemory },
        { status: 200 },
      );
    }

    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const updatedMemory = await prisma.memory.update({
      where: { id: memoryId },
      data: {
        encryptedContent: encrypt(content.trim(), memory.user.encryptionKey),
        memoryDate: memoryDate ? new Date(memoryDate) : memory.memoryDate,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, data: updatedMemory },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating memory:", error);
    return NextResponse.json(
      { error: "Failed to update memory" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { id } = await params;
    const memoryId = Number(id);

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

    await prisma.memory.update({
      where: { id: memoryId },
      data: {
        isArchived: true,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, message: "Memory deleted" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting memory:", error);
    return NextResponse.json(
      { error: "Failed to delete memory" },
      { status: 500 },
    );
  }
}
