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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const albumId = Number(id);
    const userId = Number(session.user.id);

    if (!Number.isFinite(albumId) || albumId <= 0) {
      return NextResponse.json(
        { error: "Invalid album ID" },
        { status: 400 }
      );
    }

    const album = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
    }

    if (album.userId !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to pin this album" },
        { status: 403 }
      );
    }

    let nextPinned = album.isPinned;

    try {
      const body = await request.json();
      if (typeof body?.pinned === "boolean") {
        nextPinned = body.pinned;
      } else {
        nextPinned = !album.isPinned;
      }
    } catch {
      nextPinned = !album.isPinned;
    }

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        isPinned: nextPinned,
        pinnedAt: nextPinned ? album.pinnedAt ?? new Date() : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedAlbum,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error toggling album pin status:", error);
    return NextResponse.json(
      { error: "Failed to update album pin status" },
      { status: 500 }
    );
  }
}
