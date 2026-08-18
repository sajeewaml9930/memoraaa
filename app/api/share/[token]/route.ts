import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { decryptData } from "@/app/lib/encryption";

const SHARE_COOKIE_PREFIX = "memoraa_share_";

function getVerifiedCookieName(token: string) {
  return `${SHARE_COOKIE_PREFIX}${token}`;
}

function isLinkVerified(request: NextRequest, token: string): boolean {
  return request.cookies.get(getVerifiedCookieName(token))?.value === "verified";
}

function sanitizeSharePayload(memory: any, shareLink: any, token: string) {
  const payload: Record<string, unknown> = {
    id: memory.id,
    token,
    memoryType: memory.memoryType,
    title: memory.title ?? null,
    description: memory.description ?? null,
    location: memory.location ?? null,
    mood: memory.mood ?? null,
    memoryDate: memory.memoryDate,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    userId: memory.userId,
    expiresAt: shareLink.expiresAt,
    viewCount: shareLink.viewCount,
    passwordProtected: Boolean(shareLink.passwordHash),
    mediaUrl: memory.encryptedFilePath ? `/api/share/${token}/media` : null,
  };

  if (memory.encryptedContent) {
    payload.content = decryptData(memory.encryptedContent, memory.user.encryptionKey) as string;
  }

  if (memory.thumbnailPath) {
    payload.thumbnailUrl = `/api/share/${token}/media?thumb=1`;
  }

  return payload;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const shareLink = await prisma.sharedMemoryLink.findUnique({
      where: { token },
      include: {
        memory: {
          include: {
            user: {
              select: { encryptionKey: true },
            },
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (!shareLink.isActive) {
      return NextResponse.json({ error: "This link has been revoked" }, { status: 410 });
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This link has expired", expired: true }, { status: 410 });
    }

    const verified = isLinkVerified(request, token);

    if (shareLink.passwordHash && !verified) {
      return NextResponse.json({
        success: true,
        requiresPassword: true,
        token,
        passwordProtected: true,
        expiresAt: shareLink.expiresAt,
      });
    }

    if (!shareLink.memory || !shareLink.memory.user?.encryptionKey) {
      return NextResponse.json({ error: "Memory not found or encryption key missing" }, { status: 404 });
    }

    const payload = sanitizeSharePayload(shareLink.memory, shareLink, token);

    await prisma.sharedMemoryLink.update({
      where: { id: shareLink.id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: payload,
      requiresPassword: false,
    });
  } catch (error) {
    console.error("Error fetching share link:", error);
    return NextResponse.json({ error: "Failed to load shared memory" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const shareLink = await prisma.sharedMemoryLink.findUnique({ where: { token } });
    if (!shareLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (!shareLink.isActive) {
      return NextResponse.json({ success: true, message: "Link already revoked" });
    }

    await prisma.sharedMemoryLink.update({
      where: { id: shareLink.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Link revoked" });
  } catch (error) {
    console.error("Error revoking share link:", error);
    return NextResponse.json({ error: "Failed to revoke link" }, { status: 500 });
  }
}
