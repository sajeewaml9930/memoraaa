import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function GET(
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
      select: {
        id: true,
        userId: true,
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const hasAccess =
      story.userId === userId ||
      (await prisma.album.findFirst({
        where: {
          memories: { some: { memoryId: story.id } },
          OR: [{ userId }, { sharedAlbums: { some: { userId, accepted: true } } }],
        },
        select: { id: true },
      })) !== null;

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const viewers = await prisma.storyView.findMany({
      where: { memoryId: storyId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
      },
      orderBy: { viewedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: viewers.map((viewer) => ({
        id: viewer.user.id,
        username: viewer.user.username,
        fullName: viewer.user.fullName,
        avatar: viewer.user.avatar,
        viewedAt: viewer.viewedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching story viewers:", error);
    return NextResponse.json({ error: "Failed to fetch story viewers" }, { status: 500 });
  }
}
