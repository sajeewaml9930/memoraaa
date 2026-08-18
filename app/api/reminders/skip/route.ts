import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastReminderSent: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reminder skipped for today",
    });
  } catch (error) {
    console.error("Error skipping reminder:", error);
    return NextResponse.json(
      { error: "Failed to skip reminder" },
      { status: 500 }
    );
  }
}
