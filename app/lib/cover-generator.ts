import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import prisma from "@/app/lib/prisma";
import { decryptData } from "@/app/lib/encryption";
import { getFile } from "@/app/lib/storage";

const COVER_PUBLIC_ROOT = path.join(process.cwd(), "public", "uploads", "covers");

export function getCoverPhotoUrl(coverPhoto?: string | null): string | null {
  if (!coverPhoto) {
    return null;
  }

  if (coverPhoto.startsWith("http://") || coverPhoto.startsWith("https://") || coverPhoto.startsWith("/")) {
    return coverPhoto;
  }

  return `/${coverPhoto.replace(/^\/+/, "")}`;
}

async function generateCoverFromBuffer(buffer: Buffer, albumId: number, userId: number): Promise<string | null> {
  try {
    const optimizedBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 80 })
      .toBuffer();

    const coverDir = path.join(COVER_PUBLIC_ROOT, `user_${userId}`);
    fs.mkdirSync(coverDir, { recursive: true });

    const fileName = `album-${albumId}-${Date.now()}-${randomUUID()}.webp`;
    const filePath = path.join(coverDir, fileName);
    fs.writeFileSync(filePath, optimizedBuffer);

    const relativePath = path.relative(path.join(process.cwd(), "public"), filePath).replace(/\\/g, "/");
    return relativePath;
  } catch (error) {
    console.error("Failed to generate album cover:", error);
    return null;
  }
}

export async function ensureAlbumCover(albumId: number): Promise<string | null> {
  const album = await prisma.album.findUnique({
    where: { id: albumId },
    select: { coverPhoto: true, userId: true },
  });

  if (!album) {
    return null;
  }

  if (album.coverPhoto) {
    return album.coverPhoto;
  }

  const albumMemories = await prisma.albumMemory.findMany({
    where: { albumId },
    include: {
      memory: {
        include: {
          user: {
            select: { encryptionKey: true },
          },
        },
      },
    },
    orderBy: { memory: { createdAt: "asc" } },
  });

  for (const link of albumMemories) {
    const memory = link.memory;
    const memoryType = memory.memoryType;

    if (!["photo", "video"].includes(memoryType)) {
      continue;
    }

    let sourcePath: string | null = null;

    if (memoryType === "photo") {
      sourcePath = memory.encryptedFilePath;
    }

    if (memoryType === "video") {
      sourcePath = memory.thumbnailPath ?? memory.encryptedFilePath;
    }

    if (!sourcePath) {
      continue;
    }

    try {
      const encryptedBuffer = getFile(sourcePath);
      const decryptedBuffer = decryptData(encryptedBuffer, memory.user.encryptionKey) as Buffer;
      const coverPath = await generateCoverFromBuffer(decryptedBuffer, albumId, album.userId);

      if (!coverPath) {
        continue;
      }

      await prisma.album.update({
        where: { id: albumId },
        data: { coverPhoto: coverPath },
      });

      return coverPath;
    } catch (error) {
      console.warn(`Unable to generate cover for album ${albumId} from memory ${memory.id}:`, error);
    }
  }

  return null;
}
