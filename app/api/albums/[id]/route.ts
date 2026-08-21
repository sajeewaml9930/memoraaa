import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const MAX_COVER_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

function validateAlbumName(name: string): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: "Album name is required" };
  }
  if (name.trim().length > 100) {
    return { valid: false, error: "Album name must be 100 characters or less" };
  }
  return { valid: true };
}

function validateDescription(description: string): { valid: boolean; error?: string } {
  if (description && description.length > 200) {
    return { valid: false, error: "Description must be 200 characters or less" };
  }
  return { valid: true };
}

async function processCoverPhoto(buffer: Buffer): Promise<Buffer> {
  // Resize cover photo to 400x400 and optimize
  return sharp(buffer)
    .resize(400, 400, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const albumId = Number(id);
    const userId = Number(session.user.id);

    if (!Number.isFinite(albumId) || albumId <= 0) {
      return NextResponse.json(
        { error: "Invalid album ID" },
        { status: 400 }
      );
    }

    const album = await prisma.album.findFirst({
      where: {
        id: albumId,
        OR: [{ userId }, { sharedAlbums: { some: { userId, accepted: true } } }],
      },
      include: {
        user: {
          select: { id: true, email: true, fullName: true },
        },
        _count: {
          select: { memories: true },
        },
        sharedAlbums: {
          where: { accepted: true },
          include: {
            user: {
              select: { id: true, email: true, fullName: true },
            },
          },
        },
      },
    });

    if (!album) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
    }

    if (album.isArchived) {
      return NextResponse.json(
        { error: "Album is deleted" },
        { status: 404 }
      );
    }

    const albumMemories = await prisma.albumMemory.findMany({
      where: { albumId, memory: { isArchived: false } },
      select: { memory: { select: { memoryType: true } } },
    });
    const stats = albumMemories.reduce(
      (counts, entry) => {
        counts.total += 1;
        if (entry.memory.memoryType === "photo") counts.photos += 1;
        if (entry.memory.memoryType === "video") counts.videos += 1;
        if (entry.memory.memoryType === "voice" || entry.memory.memoryType === "audio") counts.audio += 1;
        return counts;
      },
      { total: 0, photos: 0, videos: 0, audio: 0 }
    );
    const { passcodeHash, _count, user: owner, ...albumData } = album;
    const collaboratorPermission = album.sharedAlbums.find((entry) => entry.userId === userId)?.permission ?? null;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...albumData,
          isLocked: Boolean(passcodeHash),
          memoryCount: _count.memories,
          stats,
          owner,
          role: album.userId === userId ? "owner" : "collaborator",
          permission: collaboratorPermission,
          collaborators: album.sharedAlbums.map((entry) => ({
            id: entry.user.id,
            email: entry.user.email,
            fullName: entry.user.fullName,
            permission: entry.permission,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching album:", error);
    return NextResponse.json(
      { error: "Failed to fetch album" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const albumId = Number(id);
    const userId = Number(session.user.id);

    if (!Number.isFinite(albumId) || albumId <= 0) {
      return NextResponse.json(
        { error: "Invalid album ID" },
        { status: 400 }
      );
    }

    // Verify album ownership
    const album = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
    }

    const canManageAlbum = album.userId === userId || (await prisma.sharedAlbum.findFirst({
      where: {
        albumId,
        userId,
        accepted: true,
        permission: "admin",
      },
    }));

    if (!canManageAlbum) {
      return NextResponse.json(
        { error: "You don't have permission to edit this album" },
        { status: 403 }
      );
    }

    // Parse form data
    const contentType = request.headers.get("content-type") || "";
    let name: string | null | undefined;
    let description: string | null | undefined;
    let isPrivate: boolean | undefined;
    let isArchived: boolean | undefined;
    let isPinned: boolean | undefined;
    let coverPhotoPath: string | undefined;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      name = Object.prototype.hasOwnProperty.call(body, "name") ? body.name : undefined;
      description = Object.prototype.hasOwnProperty.call(body, "description") ? body.description : undefined;
      isPrivate = body.isPrivate;
      isArchived = body.isArchived;
      isPinned = body.isPinned;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      name = formData.has("name") ? (formData.get("name") as string | null) : undefined;
      description = formData.has("description") ? (formData.get("description") as string | null) : undefined;
      isPrivate = formData.has("isPrivate") ? formData.get("isPrivate") === "true" : undefined;
      isArchived = formData.has("isArchived") ? formData.get("isArchived") === "true" : undefined;
      isPinned = formData.has("isPinned") ? formData.get("isPinned") === "true" : undefined;
      const coverPhotoFile = formData.get("coverPhoto") as File | null;

      if (coverPhotoFile) {
        // Validate file size
        if (coverPhotoFile.size > MAX_COVER_PHOTO_SIZE) {
          return NextResponse.json(
            { error: "Cover photo must be 5MB or smaller" },
            { status: 400 }
          );
        }

        // Validate file type
        const normalizedMimeType = normalizeMimeType(coverPhotoFile.type);
        if (!ALLOWED_IMAGE_TYPES.has(normalizedMimeType)) {
          return NextResponse.json(
            { error: "Invalid image format. Allowed: JPEG, PNG, WebP, GIF" },
            { status: 400 }
          );
        }

        // Process cover photo
        try {
          const buffer = await coverPhotoFile.arrayBuffer();
          const processedBuffer = await processCoverPhoto(Buffer.from(buffer));

          // Save processed cover photo
          const storageRoot = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), "storage", "uploads");
          const userFolder = `user_${userId}`;
          const coversFolder = path.join(storageRoot, userFolder, "covers");
          
          // Ensure covers folder exists
          if (!fs.existsSync(coversFolder)) {
            fs.mkdirSync(coversFolder, { recursive: true });
          }

          const fileName = `${Date.now()}-${randomUUID()}.jpg`;
          const filePath = path.join(coversFolder, fileName);
          fs.writeFileSync(filePath, processedBuffer);

          // Store relative path
          coverPhotoPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");

          // Delete old cover photo if exists
          if (album.coverPhoto) {
            try {
              const oldPath = path.isAbsolute(album.coverPhoto)
                ? album.coverPhoto
                : path.resolve(process.cwd(), album.coverPhoto);
              if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
              }
            } catch (error) {
              console.warn("Failed to delete old cover photo:", error);
            }
          }
        } catch (error) {
          console.error("Error processing cover photo:", error);
          return NextResponse.json(
            { error: "Failed to process cover photo" },
            { status: 500 }
          );
        }
      }
    }

    // Validate inputs
    const updateData: Record<string, string | boolean | null> = {};

    if (name !== undefined) {
      const validation = validateAlbumName(name || "");
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      updateData.name = (name || "").trim();
    }

    if (description !== undefined) {
      const validation = validateDescription(description || "");
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      updateData.description = description ? description.trim() : null;
    }

    if (isPrivate !== undefined) {
      updateData.isPrivate = isPrivate;
    }

    if (isArchived !== undefined) {
      updateData.isArchived = isArchived;
    }

    if (isPinned !== undefined) {
      updateData.isPinned = isPinned;
    }

    if (coverPhotoPath) {
      updateData.coverPhoto = coverPhotoPath;
    }

    // If no updates provided, return current album
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: true, data: album },
        { status: 200 }
      );
    }

    // Update album
    const updatedAlbum = await prisma.album.update({
      where: { id: albumId },
      data: updateData,
      include: {
        _count: {
          select: { memories: true },
        },
      },
    });

    const { passcodeHash, _count, ...albumData } = updatedAlbum;

    return NextResponse.json(
      {
        success: true,
        data: {
          ...albumData,
          isLocked: Boolean(passcodeHash),
          memoryCount: _count.memories,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating album:", error);
    return NextResponse.json(
      { error: "Failed to update album" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const albumId = Number(id);
    const userId = Number(session.user.id);

    if (!Number.isFinite(albumId) || albumId <= 0) {
      return NextResponse.json(
        { error: "Invalid album ID" },
        { status: 400 }
      );
    }

    const album = await prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      return NextResponse.json(
        { error: "Album not found" },
        { status: 404 }
      );
    }

    if (album.userId !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to delete this album" },
        { status: 403 }
      );
    }

    if (album.isArchived) {
      return NextResponse.json(
        { success: true, message: "Album already deleted" },
        { status: 200 }
      );
    }

    const albumMemories = await prisma.albumMemory.findMany({
      where: { albumId },
      select: { memoryId: true },
    });

    const memoryIds = albumMemories.map((albumMemory) => albumMemory.memoryId);
    const sharedMemoryIds = memoryIds.length
      ? await prisma.albumMemory.findMany({
          where: {
            memoryId: { in: memoryIds },
            NOT: {
              albumId,
            },
          },
          select: { memoryId: true },
        })
      : [];

    const sharedSet = new Set(sharedMemoryIds.map((entry) => entry.memoryId));
    const memoryIdsToArchive = memoryIds.filter(
      (memoryId) => !sharedSet.has(memoryId)
    );

    await prisma.$transaction(async (tx) => {
      await tx.album.update({
        where: { id: albumId },
        data: {
          isArchived: true,
          updatedAt: new Date(),
        },
      });

      if (memoryIdsToArchive.length > 0) {
        await tx.memory.updateMany({
          where: {
            id: { in: memoryIdsToArchive },
          },
          data: {
            isArchived: true,
            updatedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: "Album deleted",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting album:", error);
    return NextResponse.json(
      { error: "Failed to delete album" },
      { status: 500 }
    );
  }
}
