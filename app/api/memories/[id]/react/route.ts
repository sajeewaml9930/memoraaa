import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { emitToAlbum } from "@/app/lib/socket";

async function getMemoryAccess(memoryId: number, userId: number) {
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
  const sharedAlbumAccess = await prisma.sharedAlbum.findFirst({
    where: {
      albumId: { in: albumIds },
      userId,
      accepted: true,
      permission: { in: ["view", "edit", "admin"] },
    },
  });

  return {
    memory,
    allowed: isOwner || Boolean(sharedAlbumAccess),
    albumIds,
  };
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
    const memoryId = Number(id);
    const userId = Number(session.user.id);

    if (!Number.isFinite(memoryId)) {
      return NextResponse.json({ error: "Invalid memory id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const rawEmoji = typeof body?.emoji === "string" ? body.emoji : "";
    const emoji = rawEmoji.trim().slice(0, 10);

    if (!emoji) {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
    }

    const { memory, allowed, albumIds } = await getMemoryAccess(memoryId, userId);

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingReaction = await prisma.memoryReaction.findUnique({
      where: {
        memoryId_userId_emoji: {
          memoryId,
          userId,
          emoji,
        },
      },
    });

    if (existingReaction) {
      await prisma.memoryReaction.delete({
        where: {
          id: existingReaction.id,
        },
      });
    } else {
      await prisma.memoryReaction.create({
        data: {
          memoryId,
          userId,
          emoji,
        },
      });
    }

    const reactions = await prisma.memoryReaction.findMany({
      where: { memoryId },
      orderBy: [{ createdAt: "asc" }],
    });

    for (const albumId of albumIds) {
      emitToAlbum("reaction_updated", albumId, {
        albumId,
        memoryId,
        reactions,
      });
    }

    return NextResponse.json({ success: true, data: { memoryId, reactions } }, { status: 200 });
  } catch (error) {
    console.error("Error toggling memory reaction:", error);
    return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
  }
}
