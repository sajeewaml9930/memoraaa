import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { decryptData } from "@/app/lib/encryption";
import { getFile } from "@/app/lib/storage";

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { fileId } = await params;

    if (!fileId) {
      return NextResponse.json({ error: "Missing file id" }, { status: 400 });
    }

    const memory = await prisma.memory.findFirst({
      where: {
        OR: [
          { encryptedFilePath: { contains: fileId } },
          { thumbnailPath: { contains: fileId } },
        ],
      },
      include: {
        user: {
          select: { encryptionKey: true },
        },
        albums: {
          include: {
            album: {
              select: {
                id: true,
                userId: true,
                sharedAlbums: {
                  where: { userId, accepted: true },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!memory) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const isOwner = memory.userId === userId;
    const hasAlbumAccess = memory.albums.some((relation) => {
      const album = relation.album;
      return album.userId === userId || album.sharedAlbums.some((sharedUser) => sharedUser.userId === userId);
    });

    if (!isOwner && !hasAlbumAccess && memory.isStory !== true) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filePath = memory.encryptedFilePath?.includes(fileId)
      ? memory.encryptedFilePath
      : memory.thumbnailPath?.includes(fileId)
        ? memory.thumbnailPath
        : null;

    if (!filePath) {
      return NextResponse.json({ error: "File path missing" }, { status: 404 });
    }

    if (!memory.user?.encryptionKey) {
      return NextResponse.json({ error: "User encryption key missing" }, { status: 500 });
    }

    const encryptedBuffer = getFile(filePath);
    const decryptedBuffer = decryptData(encryptedBuffer, memory.user.encryptionKey) as Buffer;
    const resolvedPath = filePath.toLowerCase();
    const mimeType = memory.memoryType === "voice" || memory.memoryType === "audio"
      ? "audio/mpeg"
      : memory.memoryType === "video"
        ? "video/mp4"
        : resolvedPath.endsWith(".mp4")
          ? "video/mp4"
          : resolvedPath.endsWith(".webm")
            ? "video/webm"
            : resolvedPath.endsWith(".mov") || resolvedPath.endsWith(".quicktime")
              ? "video/quicktime"
              : resolvedPath.endsWith(".mp3") || resolvedPath.endsWith(".mpeg")
                ? "audio/mpeg"
                : resolvedPath.endsWith(".ogg")
                  ? "audio/ogg"
                  : resolvedPath.endsWith(".wav")
                    ? "audio/wav"
                    : resolvedPath.endsWith(".m4a") || resolvedPath.endsWith(".aac")
                      ? "audio/mp4"
                      : resolvedPath.endsWith(".webp") || resolvedPath.includes("thumb")
                        ? "image/webp"
                        : resolvedPath.endsWith(".png")
                          ? "image/png"
                          : resolvedPath.endsWith(".gif")
                            ? "image/gif"
                            : "image/jpeg";

    return new Response(new Uint8Array(decryptedBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving media:", error);
    return NextResponse.json({ error: "Failed to serve media" }, { status: 500 });
  }
}
