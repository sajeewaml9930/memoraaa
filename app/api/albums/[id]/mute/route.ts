import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

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
    const albumId = Number(id);
    const userId = Number(session.user.id);

    if (!Number.isFinite(albumId) || albumId <= 0) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 });
    }

    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: { id: true, userId: true },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const hasAccess = album.userId === userId || await prisma.sharedAlbum.findFirst({
      where: {
        albumId,
        userId,
        accepted: true,
      },
      select: { id: true },
    });

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const muted = typeof body?.muted === "boolean" ? body.muted : undefined;

    const existingMute = await prisma.albumMute.findUnique({
      where: {
        userId_albumId: {
          userId,
          albumId,
        },
      },
    });

    let isMuted = false;

    if (muted !== undefined) {
      if (muted) {
        if (!existingMute) {
          await prisma.albumMute.create({
            data: {
              userId,
              albumId,
            },
          });
        }
        isMuted = true;
      } else {
        if (existingMute) {
          await prisma.albumMute.delete({ where: { id: existingMute.id } });
        }
        isMuted = false;
      }
    } else {
      if (existingMute) {
        await prisma.albumMute.delete({ where: { id: existingMute.id } });
        isMuted = false;
      } else {
        await prisma.albumMute.create({
          data: {
            userId,
            albumId,
          },
        });
        isMuted = true;
      }
    }

    return NextResponse.json({
      success: true,
      data: { albumId, userId, isMuted },
    });
  } catch (error) {
    console.error("Error toggling album mute:", error);
    return NextResponse.json({ error: "Failed to update mute status" }, { status: 500 });
  }
}
