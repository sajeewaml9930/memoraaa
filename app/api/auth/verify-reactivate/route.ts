import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    if (!email || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Enter the 6-digit verification code" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });
    if (!user || user.isActive) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 },
      );
    }

    const token = await prisma.verificationToken.findFirst({
      where: { userId: user.id, token: otp, type: "account_reactivation" },
    });
    if (!token || token.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { isActive: true } }),
      prisma.verificationToken.deleteMany({
        where: { userId: user.id, type: "account_reactivation" },
      }),
    ]);
    return NextResponse.json({ success: true, message: "Account reactivated" });
  } catch (error) {
    console.error("Account reactivation verification error:", error);
    return NextResponse.json(
      { error: "Unable to reactivate account" },
      { status: 500 },
    );
  }
}
