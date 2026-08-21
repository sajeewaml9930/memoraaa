import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { deleteFile, saveFile } from "@/app/lib/storage";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    const userId = Number(session?.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !MIME_TYPES[file.type]) {
      return NextResponse.json(
        { error: "Upload a valid image" },
        { status: 400 },
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5MB or smaller" },
        { status: 400 },
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { wallpaperImagePath: true },
    });
    const imagePath = saveFile(
      Buffer.from(await file.arrayBuffer()),
      `wallpaper.${MIME_TYPES[file.type]}`,
      userId,
    );
    const wallpaper = await prisma.user.update({
      where: { id: userId },
      data: {
        wallpaperType: "image",
        wallpaperValue: null,
        wallpaperImagePath: imagePath,
      },
      select: {
        wallpaperType: true,
        wallpaperValue: true,
        wallpaperImagePath: true,
      },
    });
    if (currentUser?.wallpaperImagePath)
      deleteFile(currentUser.wallpaperImagePath);

    return NextResponse.json({ success: true, data: wallpaper });
  } catch (error) {
    console.error("Error uploading wallpaper:", error);
    return NextResponse.json(
      { error: "Unable to upload wallpaper" },
      { status: 500 },
    );
  }
}
