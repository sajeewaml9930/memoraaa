import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { hasAlbumPermission } from "@/app/lib/permissions";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { albumId } = await params;
    const albumIdNumber = Number(albumId);
    const currentUserId = Number(session.user.id);

    if (!Number.isFinite(albumIdNumber) || albumIdNumber <= 0) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = Number(body?.userId);
    const permission = typeof body?.permission === "string" ? body.permission : "view";

    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    if (!["view", "add", "edit", "admin"].includes(permission)) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 400 });
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
      where: { albumId: albumIdNumber, userId, accepted: true },
    });

    if (!share) {
      return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
    }

    const updated = await prisma.sharedAlbum.update({
      where: { id: share.id },
      data: { permission },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating collaborator permission:", error);
    return NextResponse.json({ error: "Failed to update permission" }, { status: 500 });
  }
}
