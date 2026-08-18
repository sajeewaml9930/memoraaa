import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = Number(session.user.id);
    const { token } = await params;

    const shareLink = await prisma.sharedMemoryLink.findUnique({
      where: { token },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (shareLink.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.sharedMemoryLink.update({
      where: { id: shareLink.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Link revoked" });
  } catch (error) {
    console.error("Error revoking shared memory link:", error);
    return NextResponse.json({ error: "Failed to revoke link" }, { status: 500 });
  }
}
