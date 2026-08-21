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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 },
      );
    }

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        token: otp,
        type: { in: ["email_verification", "email_verification_resend"] },
      },
    });

    if (!verificationToken || verificationToken.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
      prisma.verificationToken.deleteMany({
        where: {
          userId: user.id,
          type: { in: ["email_verification", "email_verification_resend"] },
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Email verified" });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Unable to verify email" },
      { status: 500 },
    );
  }
}
