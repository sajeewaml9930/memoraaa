import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/app/lib/auth";
import { comparePassword } from "@/app/lib/encryption";
import prisma from "@/app/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    const userId = Number(session?.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;
    const password = typeof body?.password === "string" ? body.password : "";
    const confirmation =
      typeof body?.confirmation === "string" ? body.confirmation : "";

    if (action !== "delete" && action !== "deactivate") {
      return NextResponse.json(
        { error: "Invalid account action" },
        { status: 400 },
      );
    }
    const expectedConfirmation = action === "delete" ? "DELETE" : "DEACTIVATE";
    if (!password || confirmation !== expectedConfirmation) {
      return NextResponse.json(
        {
          error: `Password and ${expectedConfirmation} confirmation are required`,
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 },
      );
    }

    if (action === "deactivate") {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false, twoFactorEnabled: false },
      });
      return NextResponse.json({ success: true, action });
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Account action error:", error);
    return NextResponse.json(
      { error: "Unable to update account" },
      { status: 500 },
    );
  }
}
