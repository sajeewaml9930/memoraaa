import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/app/lib/prisma";
import { hashPassword } from "@/app/lib/encryption";
import { sendVerificationEmail } from "@/app/lib/email";

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const username =
      typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const fullName =
      typeof body?.fullName === "string" ? body.fullName.trim() : "";

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-20 characters using letters, numbers, or underscores",
        },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email or username already exists" },
        { status: 400 },
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Generate encryption key (unique per user)
    const encryptionKey = crypto.randomUUID();

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        emailVerified: false,
        passwordHash,
        encryptionKey,
        fullName,
        lastActive: new Date(),
      },
    });

    const verificationToken = await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: otp,
        expiresAt: otpExpiresAt,
        type: "email_verification",
      },
    });

    // Create default "Memories" album
    await prisma.album.create({
      data: {
        name: "Memories",
        description: "Your personal memory collection",
        userId: user.id,
        isPrivate: true,
      },
    });

    try {
      await sendVerificationEmail({ to: email, otp });
    } catch (error) {
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });
      throw error;
    }

    return NextResponse.json(
      { success: true, message: "Verification email sent" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
