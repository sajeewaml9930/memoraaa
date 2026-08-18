import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { hashPassword } from "@/app/lib/encryption";

async function canAccessMemory(memoryId: number, userId: number) {
  const memory = await prisma.memory.findUnique({
    where: { id: memoryId },
    include: {
      albums: true,
    },
  });

  if (!memory) {
    return { memory: null, allowed: false };
  }

  if (memory.userId === userId) {
    return { memory, allowed: true };
  }

  const albumIds = memory.albums.map((albumMemory) => albumMemory.albumId);
  const albumAccess = await prisma.sharedAlbum.findFirst({
    where: {
      albumId: { in: albumIds },
      userId,
      accepted: true,
      permission: { in: ["view", "add", "edit", "admin"] },
    },
  });

  return {
    memory,
    allowed: Boolean(albumAccess),
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ memoryId: string }> }) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { memoryId } = await params;
    const memoryIdNumber = Number(memoryId);

    if (!Number.isFinite(memoryIdNumber) || memoryIdNumber <= 0) {
      return NextResponse.json({ error: "Invalid memory ID" }, { status: 400 });
    }

    const { memory, allowed } = await canAccessMemory(memoryIdNumber, userId);

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const expiresInValue = body?.expiresIn;
    const passwordValue = typeof body?.password === "string" ? body.password.trim() : "";

    let expiresAt: Date | null = null;
    if (typeof expiresInValue === "number" && Number.isFinite(expiresInValue) && expiresInValue > 0) {
      expiresAt = new Date(Date.now() + expiresInValue * 60 * 60 * 1000);
    } else if (typeof expiresInValue === "string") {
      const parsedHours = Number(expiresInValue);
      if (Number.isFinite(parsedHours) && parsedHours > 0) {
        expiresAt = new Date(Date.now() + parsedHours * 60 * 60 * 1000);
      }
    }

    if (body?.expiresAt && typeof body.expiresAt === "string") {
      const parsedDate = new Date(body.expiresAt);
      if (!Number.isNaN(parsedDate.getTime())) {
        expiresAt = parsedDate;
      }
    }

    const passwordHash = passwordValue ? await hashPassword(passwordValue) : null;
    const existingLink = await prisma.sharedMemoryLink.findFirst({
      where: {
        memoryId: memoryIdNumber,
        userId,
        isActive: true,
      },
    });

    const shareLink = existingLink
      ? await prisma.sharedMemoryLink.update({
          where: { id: existingLink.id },
          data: {
            token: existingLink.token,
            expiresAt,
            passwordHash,
            isActive: true,
          },
        })
      : await prisma.sharedMemoryLink.create({
          data: {
            token: randomUUID(),
            memoryId: memoryIdNumber,
            userId,
            expiresAt,
            passwordHash,
            isActive: true,
          },
        });

    return NextResponse.json({
      success: true,
      data: {
        token: shareLink.token,
        url: `/share/${shareLink.token}`,
        expiresAt: shareLink.expiresAt,
        passwordProtected: Boolean(shareLink.passwordHash),
      },
    });
  } catch (error) {
    console.error("Error creating share link:", error);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }
}
