import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;
    const invite = await prisma.sharedAlbum.findFirst({
      where: { token, accepted: false },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const userId = Number(session.user.id);
    const isRecipient = invite.userId === userId;

    if (!isRecipient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.sharedAlbum.delete({ where: { id: invite.id } });

    return NextResponse.json({ success: true, message: "Invitation rejected" });
  } catch (error) {
    console.error("Error rejecting invite:", error);
    return NextResponse.json({ error: "Failed to reject invitation" }, { status: 500 });
  }
}
