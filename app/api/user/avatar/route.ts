import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { saveFile, deleteFile, getFile } from "@/app/lib/storage";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxAvatarBytes = 5 * 1024 * 1024;

function getFileExtension(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
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
      select: { avatar: true },
    });

    if (!user?.avatar) {
      return NextResponse.json({ error: "Avatar not found" }, { status: 404 });
    }

    const fileBuffer = getFile(user.avatar);
    const mimeType = user.avatar.toLowerCase().endsWith(".png")
      ? "image/png"
      : user.avatar.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching avatar:", error);
    return NextResponse.json({ error: "Failed to fetch avatar" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Avatar file is required" }, { status: 400 });
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
    }

    if (file.size > maxAvatarBytes) {
      return NextResponse.json({ error: "Avatar must be 5MB or smaller" }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `avatar_${Date.now()}.${getFileExtension(file.type)}`;
    const nextPath = saveFile(buffer, fileName, userId);

    if (currentUser?.avatar) {
      try {
        deleteFile(currentUser.avatar);
      } catch (error) {
        console.warn("Failed to remove old avatar:", error);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: nextPath },
      select: { avatar: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        avatar: updatedUser.avatar ? "/api/user/avatar" : null,
      },
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!currentUser?.avatar) {
      return NextResponse.json({ success: true, data: { avatar: null } });
    }

    try {
      deleteFile(currentUser.avatar);
    } catch (error) {
      console.warn("Failed to delete avatar file:", error);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
    });

    return NextResponse.json({ success: true, data: { avatar: null } });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return NextResponse.json({ error: "Failed to remove avatar" }, { status: 500 });
  }
}
