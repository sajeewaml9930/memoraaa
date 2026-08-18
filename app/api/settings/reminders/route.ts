import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

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
        dailyReminderTime: true,
        dailyReminderEnabled: true,
        timezone: true,
        lastReminderSent: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const reminderTime = user.dailyReminderTime
      ? `${String(user.dailyReminderTime.getHours()).padStart(2, "0")}:${String(
          user.dailyReminderTime.getMinutes()
        ).padStart(2, "0")}`
      : null;

    return NextResponse.json({
      success: true,
      data: {
        dailyReminderTime: reminderTime,
        dailyReminderEnabled: user.dailyReminderEnabled,
        timezone: user.timezone || "UTC",
        lastReminderSent: user.lastReminderSent,
      },
    });
  } catch (error) {
    console.error("Error fetching reminder settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminder settings" },
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
    const updateFields: Record<string, any> = {};

    if (typeof body?.dailyReminderEnabled === "boolean") {
      updateFields.dailyReminderEnabled = body.dailyReminderEnabled;
    }

    if (typeof body?.timezone === "string") {
      const trimmedTz = body.timezone.trim();
      if (trimmedTz.length > 0 && trimmedTz.length <= 50) {
        updateFields.timezone = trimmedTz;
      }
    }

    if (typeof body?.dailyReminderTime === "string") {
      const timeStr = body.dailyReminderTime.trim();

      if (timeStr === "" || timeStr === null) {
        updateFields.dailyReminderTime = null;
      } else if (!TIME_REGEX.test(timeStr)) {
        return NextResponse.json(
          { error: "Time must be in HH:MM format (24-hour)" },
          { status: 400 }
        );
      } else {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const timeObj = new Date();
        timeObj.setHours(hours, minutes, 0, 0);
        updateFields.dailyReminderTime = timeObj;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "No reminder settings provided" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateFields,
      select: {
        dailyReminderTime: true,
        dailyReminderEnabled: true,
        timezone: true,
        lastReminderSent: true,
      },
    });

    const reminderTime = updatedUser.dailyReminderTime
      ? `${String(updatedUser.dailyReminderTime.getHours()).padStart(2, "0")}:${String(
          updatedUser.dailyReminderTime.getMinutes()
        ).padStart(2, "0")}`
      : null;

    return NextResponse.json({
      success: true,
      data: {
        dailyReminderTime: reminderTime,
        dailyReminderEnabled: updatedUser.dailyReminderEnabled,
        timezone: updatedUser.timezone || "UTC",
        lastReminderSent: updatedUser.lastReminderSent,
      },
    });
  } catch (error) {
    console.error("Error updating reminder settings:", error);
    return NextResponse.json(
      { error: "Failed to update reminder settings" },
      { status: 500 }
    );
  }
}
