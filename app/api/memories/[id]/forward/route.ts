import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/app/lib/prisma";
import { authConfig } from "@/app/lib/auth";
import { ensureAlbumPermission } from "@/app/lib/permissions";
import { encrypt, decrypt } from "@/app/lib/encryption";
import { emitToAlbum } from "@/app/lib/socket";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { id } = await params;
    const memoryId = Number(id);

    if (!Number.isFinite(memoryId) || memoryId <= 0) {
      return NextResponse.json({ error: "Invalid memory ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const targetAlbumId = Number(body?.targetAlbumId ?? 0);

    if (!Number.isFinite(targetAlbumId) || targetAlbumId <= 0) {
      return NextResponse.json({ error: "Invalid targetAlbumId" }, { status: 400 });
    }

    const memory = await prisma.memory.findUnique({ where: { id: memoryId } });
    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Ensure the requesting user can view the memory via at least one album containing it
    const albumMem = await prisma.albumMemory.findFirst({ where: { memoryId }, select: { albumId: true } });
    if (!albumMem) {
      return NextResponse.json({ error: "Memory is not associated with any album" }, { status: 404 });
    }

    const canView = await ensureAlbumPermission(userId, albumMem.albumId, "view");
    if (!canView.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ensure target album exists and user has add permission
    const targetAlbum = await prisma.album.findUnique({ where: { id: targetAlbumId } });
    if (!targetAlbum) {
      return NextResponse.json({ error: "Target album not found" }, { status: 404 });
    }

    const canAdd = await ensureAlbumPermission(userId, targetAlbumId, "add");
    if (!canAdd.allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Try to re-encrypt text content with current user's key if possible
    let resultingEncryptedContent = memory.encryptedContent ?? null;

    if (memory.encryptedContent) {
      try {
        const originalUser = await prisma.user.findUnique({ where: { id: memory.userId }, select: { encryptionKey: true } });
        const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { encryptionKey: true } });

        if (originalUser?.encryptionKey && currentUser?.encryptionKey) {
          try {
            const plaintext = decrypt(memory.encryptedContent, originalUser.encryptionKey);
            resultingEncryptedContent = encrypt(plaintext, currentUser.encryptionKey);
          } catch (e) {
            // If decryption fails, fall back to copying encrypted content as-is
            resultingEncryptedContent = memory.encryptedContent;
          }
        }
      } catch (err) {
        // Ignore and reuse encrypted content
        resultingEncryptedContent = memory.encryptedContent;
      }
    }

    // Create new memory record copying fields, but set new owner and album
    const newMemory = await prisma.memory.create({
      data: {
        memoryType: memory.memoryType,
        encryptedContent: resultingEncryptedContent,
        encryptedFilePath: memory.encryptedFilePath,
        thumbnailPath: memory.thumbnailPath,
        duration: memory.duration,
        title: memory.title,
        description: memory.description,
        mood: memory.mood,
        isFavorite: false,
        isPinned: false,
        isArchived: false,
        viewCount: 0,
        memoryDate: memory.memoryDate,
        userId,
        forwardedFromId: memory.id,
        status: memory.status === "ready" ? "ready" : "ready",
      },
    });

    // Link memory to target album
    await prisma.albumMemory.create({ data: { albumId: targetAlbumId, memoryId: newMemory.id } });

    const responseMemory = { ...newMemory, albumId: targetAlbumId } as any;

    // Emit socket event to target album
    try {
      emitToAlbum("new_memory", targetAlbumId, { albumId: targetAlbumId, memory: responseMemory });
    } catch (e) {
      // ignore socket errors
    }

    return NextResponse.json({ success: true, data: responseMemory }, { status: 201 });
  } catch (error) {
    console.error("Error forwarding memory:", error);
    return NextResponse.json({ error: "Failed to forward memory" }, { status: 500 });
  }
}
