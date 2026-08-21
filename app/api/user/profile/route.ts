import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/;

function sanitizeUser(user: {
  id: number;
  username: string;
  email: string;
  fullName: string | null;
  bio: string | null;
  avatar: string | null;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName ?? "",
    bio: user.bio ?? "",
    avatar: user.avatar ? "/api/user/avatar" : null,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        bio: true,
        avatar: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, data: sanitizeUser(user) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const updateFields: Record<string, string | null> = {};

    if (typeof body?.fullName !== "undefined") {
      const nextFullName =
        typeof body.fullName === "string" ? body.fullName.trim() : "";
      if (nextFullName === "") {
        updateFields.fullName = null;
      } else if (nextFullName.length > 100) {
        return NextResponse.json(
          { error: "Full name must be 100 characters or fewer" },
          { status: 400 },
        );
      } else {
        updateFields.fullName = nextFullName;
      }
    }

    if (typeof body?.bio !== "undefined") {
      const nextBio = typeof body.bio === "string" ? body.bio.trim() : "";
      if (nextBio === "") {
        updateFields.bio = null;
      } else if (nextBio.length > 50) {
        return NextResponse.json(
          { error: "Bio must be 50 characters or fewer" },
          { status: 400 },
        );
      } else {
        updateFields.bio = nextBio;
      }
    }

    if (typeof body?.username !== "undefined") {
      const nextUsername =
        typeof body.username === "string" ? body.username.trim() : "";
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });
      const isCurrentUsername = currentUser?.username === nextUsername;

      if (!nextUsername) {
        return NextResponse.json(
          {
            error:
              "Username must be 3-20 characters using letters, numbers, or underscores",
          },
          { status: 400 },
        );
      }

      if (!isCurrentUsername && !USERNAME_REGEX.test(nextUsername)) {
        return NextResponse.json(
          {
            error:
              "Username must be 3-20 characters using letters, numbers, or underscores",
          },
          { status: 400 },
        );
      }

      if (!isCurrentUsername) {
        const existingUsername = await prisma.user.findFirst({
          where: {
            username: nextUsername,
            NOT: { id: userId },
          },
          select: { id: true },
        });

        if (existingUsername) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 409 },
          );
        }
      }

      updateFields.username = nextUsername;
    }

    if (typeof body?.email !== "undefined") {
      const nextEmail = typeof body.email === "string" ? body.email.trim() : "";

      if (!nextEmail || !EMAIL_REGEX.test(nextEmail)) {
        return NextResponse.json(
          { error: "Please enter a valid email address" },
          { status: 400 },
        );
      }

      const existingEmail = await prisma.user.findFirst({
        where: {
          email: nextEmail,
          NOT: { id: userId },
        },
        select: { id: true },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 },
        );
      }

      updateFields.email = nextEmail;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No profile fields provided" },
        { status: 400 },
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateFields,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        bio: true,
        avatar: true,
      },
    });

    return NextResponse.json(
      { success: true, data: sanitizeUser(updatedUser) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}
