import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { getSocketServer } from "@/app/lib/socket";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { id } = await params;
    const storyId = Number(id);

    if (!Number.isFinite(storyId)) {
      return NextResponse.json({ error: "Invalid story id" }, { status: 400 });
    }

    const story = await prisma.memory.findFirst({
      where: {
        id: storyId,
        isStory: true,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true, viewCount: true },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found or expired" }, { status: 404 });
    }

    const existing = await prisma.storyView.findUnique({
      where: {
        userId_memoryId: {
          userId,
          memoryId: storyId,
        },
      },
    });

    let viewerCount = story.viewCount;

    if (story.userId !== userId && !existing) {
      await prisma.storyView.create({
        data: {
          userId,
          memoryId: storyId,
        },
      });

      viewerCount = await prisma.storyView.count({ where: { memoryId: storyId } });
      await prisma.memory.update({
        where: { id: storyId },
        data: { viewCount: viewerCount },
      });

      const io = getSocketServer();
      if (io) {
        io.emit("story_viewed", {
          storyId,
          viewerId: userId,
          viewerCount,
        });
      }
    } else {
      viewerCount = await prisma.storyView.count({ where: { memoryId: storyId } });
    }

    return NextResponse.json({
      success: true,
      message: "Story marked as viewed",
      data: {
        viewed: true,
        storyId,
        viewerCount,
      },
    });
  } catch (error) {
    console.error("Error viewing story:", error);
    return NextResponse.json({ error: "Failed to mark story as viewed" }, { status: 500 });
  }
}
