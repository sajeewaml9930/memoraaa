import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { hasAlbumPermission } from "@/app/lib/permissions";

export async function GET(
  _request: NextRequest,
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

    const allowed = await hasAlbumPermission(currentUserId, albumIdNumber, "admin");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invites = await prisma.sharedAlbum.findMany({
      where: {
        albumId: albumIdNumber,
        accepted: false,
      },
      include: {
        user: {
          select: { id: true, email: true, fullName: true },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: invites.map((invite) => ({
        ...invite,
        user: invite.user,
      })),
    });
  } catch (error) {
    console.error("Error fetching album invites:", error);
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
  }
}
