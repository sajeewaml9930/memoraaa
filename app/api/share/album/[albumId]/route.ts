import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { hasAlbumPermission } from "@/app/lib/permissions";
import { sendAlbumInvitationEmail } from "@/app/lib/email";
import { emitToUser } from "@/app/lib/socket";

export async function POST(
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

    const album = await prisma.album.findUnique({
      where: { id: albumIdNumber },
      select: { id: true, userId: true, name: true },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    if (album.userId !== currentUserId) {
      const hasAdminAccess = await hasAlbumPermission(currentUserId, albumIdNumber, "admin");
      if (!hasAdminAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      permission?: unknown;
    };
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const permission = typeof body?.permission === "string" ? body.permission : "view";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const allowedPermission = ["view", "add", "edit", "admin"] as const;
    if (!allowedPermission.includes(permission as (typeof allowedPermission)[number])) {
      return NextResponse.json({ error: "Invalid permission" }, { status: 400 });
    }

    const invitedUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true },
    });

    if (!invitedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const inviteToken = randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const existingInvite = await prisma.sharedAlbum.findFirst({
      where: { albumId: albumIdNumber, userId: invitedUser.id },
    });

    const invite = existingInvite
      ? await prisma.sharedAlbum.update({
          where: { id: existingInvite.id },
          data: {
            permission,
            invitedAt: new Date(),
            accepted: false,
            token: existingInvite.token ?? inviteToken,
            inviteExpiresAt: existingInvite.inviteExpiresAt ?? inviteExpiresAt,
            muted: false,
          },
        })
      : await prisma.sharedAlbum.create({
          data: {
            albumId: albumIdNumber,
            userId: invitedUser.id,
            permission,
            accepted: false,
            muted: false,
            invitedAt: new Date(),
            token: inviteToken,
            inviteExpiresAt,
          },
        });

    const inviteUrl = `${new URL(request.url).origin}/invite/${invite.token ?? inviteToken}`;
    const inviterName = session.user.name ?? "A Memoraa collaborator";
    let notificationStatus: "created" | "failed" = "created";
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: invitedUser.id,
          type: "invite",
          message: `${inviterName} invited you to collaborate on ${album.name}`,
          content: JSON.stringify({
            albumId: album.id,
            albumName: album.name,
            inviterName,
            permission,
          }),
          link: `/invite/${invite.token ?? inviteToken}`,
        },
      });
      console.info("[invite.create] In-app notification created", {
        inviteId: invite.id,
        recipientId: invitedUser.id,
      });
      emitToUser("notification", invitedUser.id, notification);
    } catch (notificationError) {
      notificationStatus = "failed";
      console.error("[invite.create] In-app notification creation failed", {
        inviteId: invite.id,
        recipientId: invitedUser.id,
        error: notificationError,
      });
    }

    let emailStatus: { sent: boolean; skipped?: boolean; messageId?: string; error?: string };
    try {
      const emailResult = await sendAlbumInvitationEmail({
        to: invitedUser.email,
        albumName: album.name,
        inviterName,
        inviteUrl,
        permission,
      });
      emailStatus = emailResult.skipped
        ? { sent: false, skipped: true }
        : { sent: true, messageId: emailResult.messageId };
      console.info("[invite.create] Invitation email processed", {
        inviteId: invite.id,
        albumId: album.id,
        recipient: invitedUser.email,
        ...emailStatus,
      });
    } catch (emailError) {
      emailStatus = {
        sent: false,
        error: emailError instanceof Error ? emailError.message : "Unknown email error",
      };
      console.error("[invite.create] Invitation email delivery failed", {
        inviteId: invite.id,
        albumId: album.id,
        recipient: invitedUser.email,
        error: emailError,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent",
      data: {
        ...invite,
        token: invite.token ?? inviteToken,
        inviteUrl,
        inviteExpiresAt: invite.inviteExpiresAt ?? inviteExpiresAt,
        email: emailStatus,
        notification: { created: notificationStatus === "created" },
        album: { id: album.id, name: album.name },
        user: {
          id: invitedUser.id,
          email: invitedUser.email,
          fullName: invitedUser.fullName,
        },
      },
    });
  } catch (error) {
    console.error("Error creating share invite:", error);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}
