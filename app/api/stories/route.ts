import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { decrypt, encrypt } from "@/app/lib/encryption";

const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const now = new Date();

    const accessibleStories = await prisma.memory.findMany({
      where: {
        isStory: true,
        expiresAt: { gt: now },
        OR: [
          { userId },
          {
            albums: {
              some: {
                album: {
                  OR: [
                    { userId },
                    { sharedAlbums: { some: { userId, accepted: true } } },
                  ],
                },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
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
          },
        },
        albums: {
          include: {
            album: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const stories = accessibleStories.map((story) => {
      let storyContent = "";

      if (story.encryptedContent && story.user?.encryptionKey) {
        try {
          storyContent = decrypt(story.encryptedContent, story.user.encryptionKey);
        } catch (error) {
          console.error("Failed to decrypt story content for list view:", error);
        }
      }

      return {
        ...story,
        storyContent,
        hasViewed: story.storyViews.some((view) => view.userId === userId),
        albumName: story.albums[0]?.album?.name ?? null,
      };
    });

    const grouped = stories.reduce<Record<number, typeof stories>>((acc, story) => {
      if (!acc[story.userId]) {
        acc[story.userId] = [];
      }
      acc[story.userId].push(story);
      return acc;
    }, {});

    const groups = Object.entries(grouped)
      .map(([storyUserId, items]) => ({
        userId: Number(storyUserId),
        author: items[0]?.user ?? null,
        stories: items,
        hasUnread: items.some((item) => !item.hasViewed),
      }))
      .sort((left, right) => {
        const latestLeft = new Date(left.stories[0]?.createdAt ?? 0).getTime();
        const latestRight = new Date(right.stories[0]?.createdAt ?? 0).getTime();
        return latestRight - latestLeft;
      });

    return NextResponse.json({
      success: true,
      data: {
        groups,
        totalStories: stories.length,
        unreadCount: groups.filter((group) => group.hasUnread).length,
      },
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { memoryType, content, albumId, memoryDate, isStory, title, description } = await request.json();

    if (!memoryType || !content || isStory !== true) {
      return NextResponse.json({ error: "Story content is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { encryptionKey: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const encryptedContent = encrypt(String(content), user.encryptionKey);
    const expiresAt = new Date(Date.now() + STORY_TTL_MS);

    const story = await prisma.memory.create({
      data: {
        memoryType,
        encryptedContent,
        title: title ?? "Story",
        description: description ?? (typeof content === "string" ? content.slice(0, 200) : undefined),
        memoryDate: memoryDate ? new Date(memoryDate) : new Date(),
        userId,
        isStory: true,
        expiresAt,
        status: "ready",
        viewCount: 0,
      },
    });

    if (albumId) {
      const albumIdNumber = Number(albumId);
      const album = await prisma.album.findFirst({
        where: {
          id: albumIdNumber,
          OR: [{ userId }, { sharedAlbums: { some: { userId, accepted: true } } }],
        },
      });

      if (album) {
        await prisma.albumMemory.create({
          data: { albumId: album.id, memoryId: story.id },
        }).catch(() => undefined);
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...story, storyContent: String(content) },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating story:", error);
    return NextResponse.json({ error: "Failed to create story" }, { status: 500 });
  }
}
