import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { decrypt } from "@/app/lib/encryption";

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
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
            encryptionKey: true,
          },
        },
        storyViews: {
          select: {
            userId: true,
            viewedAt: true,
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    const hasAlbumAccess = await prisma.album.findFirst({
      where: {
        memories: { some: { memoryId: story.id } },
        OR: [{ userId }, { sharedAlbums: { some: { userId, accepted: true } } }],
      },
      select: { id: true },
    });

    if (!hasAlbumAccess && story.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let storyContent = "";
    if (story.encryptedContent && story.user?.encryptionKey) {
      try {
        storyContent = decrypt(story.encryptedContent, story.user.encryptionKey);
      } catch (error) {
        console.error("Failed to decrypt story content:", error);
      }
    }

    const hasViewed = story.storyViews.some((view) => view.userId === userId);

    return NextResponse.json({
      success: true,
      data: {
        ...story,
        storyContent,
        hasViewed,
        viewCount: story.storyViews.length,
      },
    });
  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json({ error: "Failed to fetch story" }, { status: 500 });
  }
}
