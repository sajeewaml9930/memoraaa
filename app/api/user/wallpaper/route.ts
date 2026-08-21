import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { deleteFile, saveFile } from "@/app/lib/storage";

const WALLPAPER_TYPES = new Set(["default", "solid", "pattern", "image"]);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function getUserId() {
  const session = await getServerSession(authConfig);
  const userId = Number(session?.user?.id);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        wallpaperType: true,
        wallpaperValue: true,
        wallpaperImagePath: true,
      },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error fetching wallpaper:", error);
    return NextResponse.json(
      { error: "Unable to fetch wallpaper" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => null);
    const type = typeof body?.type === "string" ? body.type : "";
    const value = typeof body?.value === "string" ? body.value : null;

    if (!WALLPAPER_TYPES.has(type)) {
      return NextResponse.json(
        { error: "Invalid wallpaper type" },
        { status: 400 },
      );
    }
    if (type === "solid" && (!value || !HEX_COLOR.test(value))) {
      return NextResponse.json(
        { error: "Invalid wallpaper color" },
        { status: 400 },
      );
    }
    if (
      type === "pattern" &&
      !["dots", "stripes", "waves"].includes(value ?? "")
    ) {
      return NextResponse.json(
        { error: "Invalid wallpaper pattern" },
        { status: 400 },
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { wallpaperImagePath: true },
    });
    let imagePath: string | null = null;
    if (type === "image") {
      const imageBase64 =
        typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
      const match = imageBase64.match(
        /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/,
      );
      if (!match)
        return NextResponse.json(
          { error: "Upload a valid image" },
          { status: 400 },
        );
      const imageBuffer = Buffer.from(match[2], "base64");
      if (imageBuffer.length > MAX_IMAGE_BYTES)
        return NextResponse.json(
          { error: "Image must be 5MB or smaller" },
          { status: 400 },
        );
      const extension = match[1].split("/")[1].replace("jpeg", "jpg");
      imagePath = saveFile(imageBuffer, `wallpaper.${extension}`, userId);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        wallpaperType: type,
        wallpaperValue:
          type === "image" ? null : type === "default" ? null : value,
        wallpaperImagePath: imagePath,
      },
      select: {
        wallpaperType: true,
        wallpaperValue: true,
        wallpaperImagePath: true,
      },
    });
    if (
      currentUser?.wallpaperImagePath &&
      currentUser.wallpaperImagePath !== imagePath
    ) {
      deleteFile(currentUser.wallpaperImagePath);
    }
    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Error updating wallpaper:", error);
    return NextResponse.json(
      { error: "Unable to update wallpaper" },
      { status: 500 },
    );
  }
}
