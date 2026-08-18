import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteId } = await params;
    const inviteNumber = Number(inviteId);
    const currentUserId = Number(session.user.id);

    if (!Number.isFinite(inviteNumber) || inviteNumber <= 0) {
      return NextResponse.json({ error: "Invalid invite ID" }, { status: 400 });
    }

    const invite = await prisma.sharedAlbum.findUnique({
      where: { id: inviteNumber },
      include: { album: true },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    if (invite.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.sharedAlbum.update({
      where: { id: invite.id },
      data: {
        accepted: true,
        muted: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Error accepting invite:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
