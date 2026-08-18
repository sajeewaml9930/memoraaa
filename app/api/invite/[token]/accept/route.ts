import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { emitToAlbum } from "@/app/lib/socket";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { token } = await params;

    const invite = await prisma.sharedAlbum.findFirst({
      where: {
        token,
        accepted: false,
      },
      include: {
        album: true,
        user: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.inviteExpiresAt && new Date(invite.inviteExpiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
    }

    if (invite.userId !== userId && invite.user?.email !== session.user.email) {
      const intendedUser = await prisma.user.findUnique({
        where: { email: session.user.email ?? "" },
        select: { id: true },
      });

      if (!intendedUser || intendedUser.id !== invite.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const existingShare = await prisma.sharedAlbum.findFirst({
      where: {
        albumId: invite.albumId,
        userId,
      },
    });

    if (existingShare) {
      await prisma.sharedAlbum.update({
        where: { id: existingShare.id },
        data: { accepted: true, permission: invite.permission },
      });
    } else {
      await prisma.sharedAlbum.create({
        data: {
          albumId: invite.albumId,
          userId,
          permission: invite.permission,
          accepted: true,
          muted: false,
          invitedAt: new Date(),
        },
      });
    }

    await prisma.sharedAlbum.delete({ where: { id: invite.id } });
    emitToAlbum("album_shared", invite.albumId, { albumId: invite.albumId, userId, permission: invite.permission });

    return NextResponse.json({ success: true, message: "Invitation accepted" });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
