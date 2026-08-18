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

    const { id } = await params;
    const albumId = Number(id);
    const userId = Number(session.user.id);

    if (!Number.isFinite(albumId) || albumId <= 0) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 });
    }

    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        OR: [{ userId }, { sharedAlbums: { some: { userId, accepted: true } } }],
      },
      select: { id: true, userId: true },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const collaborators = await prisma.sharedAlbum.findMany({
      where: { albumId, accepted: true },
      include: {
        user: {
          select: { id: true, username: true, fullName: true, email: true },
        },
      },
      orderBy: { invitedAt: "asc" },
    });

    const options = [
      {
        id: album.userId,
        username: "owner",
        fullName: "Album owner",
        email: "owner",
      },
      ...collaborators.map((entry) => ({
        id: entry.user.id,
        username: entry.user.username,
        fullName: entry.user.fullName,
        email: entry.user.email,
      })),
    ];

    return NextResponse.json({
      success: true,
      data: options,
    });
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return NextResponse.json({ error: "Failed to fetch collaborators" }, { status: 500 });
  }
}
