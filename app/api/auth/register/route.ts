import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/app/lib/prisma";
import { hashPassword } from "@/app/lib/encryption";

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";

    // Validation
    if (!email || !username || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters using letters, numbers, or underscores" },
        { status: 400 }
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
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate encryption key (unique per user)
    const encryptionKey = crypto.randomUUID();

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        encryptionKey,
        fullName,
        lastActive: new Date(),
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

    return NextResponse.json(
      { 
        message: "User registered successfully",
        userId: user.id 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
