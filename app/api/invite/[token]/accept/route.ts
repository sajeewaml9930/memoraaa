import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { emitToUser } from "@/app/lib/socket";
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

    console.info("[invite.accept] Invite loaded", {
      inviteId: invite.id,
      albumId: invite.albumId,
      intendedUserId: invite.userId,
      acceptingUserId: userId,
    });

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

    await prisma.$transaction(async (transaction) => {
      const existingShare = await transaction.sharedAlbum.findFirst({
        where: {
          albumId: invite.albumId,
          userId,
          id: { not: invite.id },
        },
      });

      if (existingShare) {
        await transaction.sharedAlbum.update({
          where: { id: existingShare.id },
          data: { accepted: true, permission: invite.permission },
        });
        await transaction.sharedAlbum.delete({ where: { id: invite.id } });
      } else {
        await transaction.sharedAlbum.update({
          where: { id: invite.id },
          data: { accepted: true },
        });
      }

      if (invite.album.userId !== userId) {
        await transaction.notification.create({
          data: {
            userId: invite.album.userId,
            type: "invite_accepted",
            message: `${session.user.name ?? session.user.email ?? "A collaborator"} accepted your invitation to ${invite.album.name}`,
            content: JSON.stringify({
              albumId: invite.albumId,
              albumName: invite.album.name,
              userId,
            }),
            link: `/album/${invite.albumId}`,
          },
        });
      }

      await transaction.notification.updateMany({
        where: {
          userId,
          type: "invite",
          link: `/invite/${token}`,
        },
        data: { read: true },
      });
    });

    if (invite.album.userId !== userId) {
      emitToUser("notification", invite.album.userId, { userId: invite.album.userId });
    }

    console.info("[invite.accept] Invitation accepted", {
      inviteId: invite.id,
      albumId: invite.albumId,
      userId,
      permission: invite.permission,
    });
    emitToAlbum("album_shared", invite.albumId, { albumId: invite.albumId, userId, permission: invite.permission });

    return NextResponse.json({ success: true, message: "Invitation accepted" });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
