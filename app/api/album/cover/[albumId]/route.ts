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

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="16" fill="#e5e7eb"/><path d="M25 65l14-17 10 11 8-9 14 15H25z" fill="#9ca3af"/><circle cx="62" cy="30" r="7" fill="#9ca3af"/></svg>`;

function placeholderResponse() {
  return new Response(PLACEHOLDER_SVG, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> },
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
      return placeholderResponse();
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
      return placeholderResponse();
    }

    console.error("Error serving album cover:", error);
    return NextResponse.json(
      { error: "Failed to serve album cover" },
      { status: 500 },
    );
  }
}
