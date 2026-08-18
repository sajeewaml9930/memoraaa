import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

function getSessionUserId(session: { user?: { id?: string | number | null } } | null | undefined) {
  const rawUserId = session?.user?.id;

  if (!rawUserId || rawUserId === "undefined" || rawUserId === "null") {
    return null;
  }

  const userId = Number(rawUserId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    const userId = getSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        emailNotificationsEnabled: user.emailNotificationsEnabled,
        inAppNotificationsEnabled: user.inAppNotificationsEnabled,
      },
    });
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json({ error: "Failed to fetch notification settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    const userId = getSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const updateData: Record<string, boolean> = {};

    if (typeof body?.emailNotificationsEnabled === "boolean") {
      updateData.emailNotificationsEnabled = body.emailNotificationsEnabled;
    }

    if (typeof body?.inAppNotificationsEnabled === "boolean") {
      updateData.inAppNotificationsEnabled = body.inAppNotificationsEnabled;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No notification settings provided" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        emailNotificationsEnabled: true,
        inAppNotificationsEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.error("Error updating notification settings:", error);
    return NextResponse.json({ error: "Failed to update notification settings" }, { status: 500 });
  }
}
