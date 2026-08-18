import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const searchId = Number(id);

    if (!Number.isFinite(searchId)) {
      return NextResponse.json({ error: "Invalid search id" }, { status: 400 });
    }

    const result = await prisma.searchHistory.deleteMany({
      where: {
        id: searchId,
        userId: Number(session.user.id),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        deleted: result.count,
      },
    });
  } catch (error) {
    console.error("Error deleting recent search:", error);
    return NextResponse.json({ error: "Failed to delete recent search" }, { status: 500 });
  }
}
