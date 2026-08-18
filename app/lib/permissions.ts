import prisma from "@/app/lib/prisma";
import type { AlbumPermission } from "@/app/types";

export const PERMISSION_LEVELS: Record<AlbumPermission, number> = {
  view: 1,
  add: 2,
  edit: 3,
  admin: 4,
};

export async function getAlbumPermission(
  userId: number,
  albumId: number
): Promise<{ isOwner: boolean; permission: AlbumPermission | null }> {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { userId: true },
  });

  if (!album) {
    return { isOwner: false, permission: null };
  }

  if (album.userId === userId) {
    return { isOwner: true, permission: "admin" };
  }

  const share = await prisma.sharedAlbum.findFirst({
    where: {
      albumId,
      userId,
      accepted: true,
    },
    select: { permission: true },
  });

  return {
    isOwner: false,
    permission: (share?.permission as AlbumPermission | undefined) ?? null,
  };
}

export async function hasAlbumPermission(
  userId: number,
  albumId: number,
  minimumPermission: AlbumPermission
): Promise<boolean> {
  const { isOwner, permission } = await getAlbumPermission(userId, albumId);

  if (isOwner) {
    return true;
  }

  if (!permission) {
    return false;
  }

  return (PERMISSION_LEVELS[permission] ?? 0) >= (PERMISSION_LEVELS[minimumPermission] ?? 0);
}

export async function ensureAlbumPermission(
  userId: number,
  albumId: number,
  minimumPermission: AlbumPermission
) {
  const allowed = await hasAlbumPermission(userId, albumId, minimumPermission);

  if (!allowed) {
    return {
      allowed: false,
      error: "Forbidden",
      status: 403,
    };
  }

  return { allowed: true, error: null, status: 200 };
}
