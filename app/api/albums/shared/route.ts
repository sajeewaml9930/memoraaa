import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const sharedAlbums = await prisma.sharedAlbum.findMany({
      where: {
        userId,
        accepted: true,
      },
      include: {
        album: {
          include: {
            _count: {
              select: { memories: true },
            },
          },
        },
      },
      orderBy: { album: { updatedAt: "desc" } },
    });

    return NextResponse.json({
      success: true,
      data: sharedAlbums.map(({ album, permission }) => ({
        ...album,
        role: "collaborator",
        permission,
        memoryCount: album._count.memories,
      })),
    });
  } catch (error) {
    console.error("Error fetching shared albums:", error);
    return NextResponse.json({ error: "Failed to fetch shared albums" }, { status: 500 });
  }
}
