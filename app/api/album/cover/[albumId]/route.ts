import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import fs from "fs/promises";
import path from "path";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";

const MIME_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const albumId = Number((await params).albumId);
    const userId = Number(session.user.id);

    if (!Number.isInteger(albumId) || albumId <= 0) {
      return NextResponse.json({ error: "Invalid album ID" }, { status: 400 });
    }

    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        OR: [
          { userId },
          { sharedAlbums: { some: { userId, accepted: true } } },
        ],
      },
      select: { coverPhoto: true },
    });

    if (!album?.coverPhoto) {
      return NextResponse.json({ error: "Cover photo not found" }, { status: 404 });
    }

    const coverPath = path.isAbsolute(album.coverPhoto)
      ? album.coverPhoto
      : path.resolve(process.cwd(), album.coverPhoto);
    const file = await fs.readFile(coverPath);
    const extension = path.extname(coverPath).toLowerCase();

    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Cover photo not found" }, { status: 404 });
    }

    console.error("Error serving album cover:", error);
    return NextResponse.json({ error: "Failed to serve album cover" }, { status: 500 });
  }
}
