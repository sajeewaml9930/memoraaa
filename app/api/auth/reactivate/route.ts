import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendAccountReactivationEmail } from "@/app/lib/email";
import prisma from "@/app/lib/prisma";

const TOKEN_TYPE = "account_reactivation";
const OTP_TTL_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true },
    });

    if (!user || user.isActive) {
      return NextResponse.json({
        success: true,
        message: "If the account is deactivated, a verification code was sent",
      });
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await prisma.verificationToken.count({
      where: { userId: user.id, type: TOKEN_TYPE, createdAt: { gt: since } },
    });
    if (recentRequests >= 3) {
      return NextResponse.json(
        { error: "Too many verification requests. Try again later." },
        { status: 429 },
      );
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id, type: TOKEN_TYPE },
    });
    const token = await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: otp,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        type: TOKEN_TYPE,
      },
    });

    try {
      await sendAccountReactivationEmail({ to: user.email, otp });
    } catch (error) {
      await prisma.verificationToken.delete({ where: { id: token.id } });
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent",
    });
  } catch (error) {
    console.error("Account reactivation OTP error:", error);
    return NextResponse.json(
      { error: "Unable to send reactivation code" },
      { status: 500 },
    );
  }
}
