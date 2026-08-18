import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { hasAlbumPermission } from "@/app/lib/permissions";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ albumId: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { albumId, userId } = await params;
    const albumIdNumber = Number(albumId);
    const targetUserId = Number(userId);
    const currentUserId = Number(session.user.id);

    if (!Number.isFinite(albumIdNumber) || albumIdNumber <= 0) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 });
    }

    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const isOwner = await prisma.album.findFirst({
      where: { id: albumIdNumber, userId: currentUserId },
      select: { id: true },
    });

    if (!isOwner) {
      const allowed = await hasAlbumPermission(currentUserId, albumIdNumber, "admin");
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const share = await prisma.sharedAlbum.findFirst({
      where: { albumId: albumIdNumber, userId: targetUserId },
    });

    if (!share) {
      return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
    }

    await prisma.sharedAlbum.delete({ where: { id: share.id } });

    return NextResponse.json({ success: true, message: "Collaborator removed" });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    return NextResponse.json({ error: "Failed to remove collaborator" }, { status: 500 });
  }
}
