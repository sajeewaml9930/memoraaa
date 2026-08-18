import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const albumId = Number(id);
    const userId = Number(session.user.id);

    if (!Number.isFinite(albumId) || albumId <= 0) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 });
    }

    const album = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    if (album.userId !== userId && album.passcodeHash) {
      const body = await request.json().catch(() => ({}));
      const passcode = typeof body?.passcode === "string" ? body.passcode : "";

      if (!passcode || !(await bcrypt.compare(passcode, album.passcodeHash))) {
        return NextResponse.json({ error: "Incorrect passcode" }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        unlocked: true,
        timeoutMinutes: album.passcodeTimeout ?? 5,
      });
    }

    return NextResponse.json({
      success: true,
      unlocked: true,
      timeoutMinutes: album.passcodeTimeout ?? 5,
    });
  } catch (error) {
    console.error("Error unlocking album:", error);
    return NextResponse.json({ error: "Failed to unlock album" }, { status: 500 });
  }
}
