import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { getFile } from "@/app/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number((await params).id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return Response.json({ error: "Invalid user id" }, { status: 400 });
    }

    const albumId = Number(new URL(request.url).searchParams.get("albumId"));
    const requesterId = Number(session.user.id);
    if (
      !Number.isFinite(albumId) ||
      albumId <= 0 ||
      !Number.isFinite(requesterId)
    ) {
      return Response.json({ error: "Invalid album id" }, { status: 400 });
    }

    const albumAccess = await prisma.album.findFirst({
      where: {
        id: albumId,
        OR: [
          { userId: requesterId },
          { sharedAlbums: { some: { userId: requesterId, accepted: true } } },
        ],
      },
      select: { id: true },
    });
    if (!albumAccess) {
      return Response.json({ error: "Album not found" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        memories: { some: { albums: { some: { albumId } } } },
      },
      select: { avatar: true },
    });

    if (!user?.avatar) {
      return Response.json({ error: "Avatar not found" }, { status: 404 });
    }

    const fileBuffer = getFile(user.avatar);
    const avatarPath = user.avatar.toLowerCase();
    const mimeType = avatarPath.endsWith(".png")
      ? "image/png"
      : avatarPath.endsWith(".webp")
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
    console.error("Error fetching user avatar:", error);
    return Response.json({ error: "Failed to fetch avatar" }, { status: 500 });
  }
}
