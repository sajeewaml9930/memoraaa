import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/app/lib/auth";
import { comparePassword, hashPassword } from "@/app/lib/encryption";
import prisma from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    const userId = Number(session?.user?.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;

    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentPasswordMatches = await comparePassword(
      currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordMatches) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Unable to change password" },
      { status: 500 },
    );
  }
}
