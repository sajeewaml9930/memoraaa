import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        memory: {
          select: { id: true, title: true, memoryDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
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
    const { notificationId, read } = body;

    if (!Number.isFinite(notificationId)) {
      return NextResponse.json(
        { error: "Invalid notification id" },
        { status: 400 }
      );
    }

    if (typeof read !== "boolean") {
      return NextResponse.json(
        { error: "read field must be boolean" },
        { status: 400 }
      );
    }

    const notification = await prisma.notification.findUnique({
      where: { id: Number(notificationId) },
    });

    if (!notification || notification.userId !== userId) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    const updated = await prisma.notification.update({
      where: { id: Number(notificationId) },
      data: { read },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
