import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { sendVerificationEmail } from "@/app/lib/email";

const VERIFICATION_TYPE = "email_verification";
const RESEND_TYPE = "email_verification_resend";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: "If the account exists, a verification email was sent",
      });
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentResends = await prisma.verificationToken.count({
      where: { userId: user.id, type: RESEND_TYPE, createdAt: { gt: since } },
    });
    if (recentResends >= 3) {
      return NextResponse.json(
        { error: "Too many verification requests. Try again later." },
        { status: 429 },
      );
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await prisma.verificationToken.updateMany({
      where: {
        userId: user.id,
        type: { in: [VERIFICATION_TYPE, RESEND_TYPE] },
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() },
    });
    const verificationToken = await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        type: RESEND_TYPE,
      },
    });
    try {
      await sendVerificationEmail({ to: user.email, otp });
    } catch (error) {
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent",
    });
  } catch (error) {
    console.error("Resend verification email error:", error);
    return NextResponse.json(
      { error: "Unable to resend verification email" },
      { status: 500 },
    );
  }
}
