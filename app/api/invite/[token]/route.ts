import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Missing invite token" }, { status: 400 });
    }

    const invite = await prisma.sharedAlbum.findFirst({
      where: {
        token,
        accepted: false,
      },
      include: {
        album: {
          select: { id: true, name: true },
        },
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.inviteExpiresAt && new Date(invite.inviteExpiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: invite.id,
        permission: invite.permission,
        createdAt: invite.invitedAt,
        expiresAt: invite.inviteExpiresAt,
        inviter: {
          id: invite.userId,
          fullName: invite.user.fullName,
          email: invite.user.email,
        },
        album: {
          id: invite.album.id,
          name: invite.album.name,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching invite:", error);
    return NextResponse.json({ error: "Failed to fetch invite" }, { status: 500 });
  }
}
