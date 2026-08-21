import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { getFile } from "@/app/lib/storage";

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    const userId = Number(session?.user?.id);
    if (!Number.isInteger(userId) || userId <= 0)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { wallpaperImagePath: true },
    });
    if (!user?.wallpaperImagePath)
      return new NextResponse(null, { status: 404 });
    const file = getFile(user.wallpaperImagePath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving wallpaper image:", error);
    return NextResponse.json(
      { error: "Unable to load wallpaper image" },
      { status: 500 },
    );
  }
}
