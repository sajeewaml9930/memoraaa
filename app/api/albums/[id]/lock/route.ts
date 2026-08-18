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

    if (album.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const passcode = typeof body?.passcode === "string" ? body.passcode : "";
    const timeout = Number(body?.timeout ?? album.passcodeTimeout ?? 5);

    if (passcode === "") {
      const updatedAlbum = await prisma.album.update({
        where: { id: albumId },
        data: {
          passcodeHash: null,
          passcodeTimeout: 5,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          ...updatedAlbum,
          isLocked: false,
        },
      });
    }

    if (passcode.trim().length < 4) {
      return NextResponse.json(
        { error: "Passcode must be at least 4 characters" },
        { status: 400 }
      );
    }

    const passcodeHash = await bcrypt.hash(passcode, 10);

    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: {
        passcodeHash,
        passcodeTimeout: Number.isFinite(timeout) && timeout > 0 ? timeout : 5,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedAlbum,
        isLocked: true,
      },
    });
  } catch (error) {
    console.error("Error setting album passcode:", error);
    return NextResponse.json({ error: "Failed to update album lock" }, { status: 500 });
  }
}
