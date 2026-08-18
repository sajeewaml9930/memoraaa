import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function DELETE() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await prisma.searchHistory.deleteMany({
      where: { userId: Number(session.user.id) },
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: result.count,
      },
    });
  } catch (error) {
    console.error("Error clearing recent searches:", error);
    return NextResponse.json({ error: "Failed to clear recent searches" }, { status: 500 });
  }
}
