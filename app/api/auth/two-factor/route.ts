import crypto from "crypto";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/app/lib/auth";
import { sendTwoFactorEmail } from "@/app/lib/email";
import prisma from "@/app/lib/prisma";

const TOKEN_TYPE = "two_factor_enable";
const OTP_TTL_MS = 10 * 60 * 1000;

async function getAuthenticatedUser() {
  const session = await getServerSession(authConfig);
  const userId = Number(session?.user?.id);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, twoFactorEnabled: true },
  });
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ enabled: user.twoFactorEnabled });
  } catch (error) {
    console.error("Error reading two-factor setting:", error);
    return NextResponse.json(
      { error: "Unable to read two-factor setting" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (typeof body?.enabled !== "boolean") {
      return NextResponse.json(
        { error: "Enabled must be a boolean" },
        { status: 400 },
      );
    }

    if (!body.enabled) {
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false },
      });
      await prisma.verificationToken.deleteMany({
        where: { userId: user.id, type: TOKEN_TYPE },
      });
      return NextResponse.json({ success: true, enabled: false });
    }

    const otp = typeof body.otp === "string" ? body.otp.trim() : "";
    if (!otp) {
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

      const newOtp = crypto.randomInt(100000, 1000000).toString();
      await prisma.verificationToken.deleteMany({
        where: { userId: user.id, type: TOKEN_TYPE },
      });
      const token = await prisma.verificationToken.create({
        data: {
          userId: user.id,
          token: newOtp,
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
          type: TOKEN_TYPE,
        },
      });
      try {
        await sendTwoFactorEmail({ to: user.email, otp: newOtp });
      } catch (error) {
        await prisma.verificationToken.delete({ where: { id: token.id } });
        throw error;
      }
      return NextResponse.json({ success: true, requiresVerification: true });
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Enter the 6-digit verification code" },
        { status: 400 },
      );
    }
    const token = await prisma.verificationToken.findFirst({
      where: { userId: user.id, token: otp, type: TOKEN_TYPE },
    });
    if (!token || token.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: true },
      }),
      prisma.verificationToken.deleteMany({
        where: { userId: user.id, type: TOKEN_TYPE },
      }),
    ]);
    return NextResponse.json({ success: true, enabled: true });
  } catch (error) {
    console.error("Error updating two-factor setting:", error);
    return NextResponse.json(
      { error: "Unable to update two-factor setting" },
      { status: 500 },
    );
  }
}
