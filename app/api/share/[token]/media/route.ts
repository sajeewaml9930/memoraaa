import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { decryptData } from "@/app/lib/encryption";
import { getFile } from "@/app/lib/storage";

const SHARE_COOKIE_PREFIX = "memoraa_share_";

function getVerifiedCookieName(token: string) {
  return `${SHARE_COOKIE_PREFIX}${token}`;
}

function isLinkVerified(request: NextRequest, token: string): boolean {
  return request.cookies.get(getVerifiedCookieName(token))?.value === "verified";
}

function resolveMimeType(memoryType: string, filePath: string) {
  const lowerPath = filePath.toLowerCase();

  if (memoryType === "voice" || memoryType === "audio") {
    return "audio/mpeg";
  }

  if (memoryType === "video") {
    return "video/mp4";
  }

  if (lowerPath.endsWith(".mp4")) {
    return "video/mp4";
  }

  if (lowerPath.endsWith(".webm")) {
    return "video/webm";
  }

  if (lowerPath.endsWith(".mov") || lowerPath.endsWith(".quicktime")) {
    return "video/quicktime";
  }

  if (lowerPath.endsWith(".mp3") || lowerPath.endsWith(".mpeg")) {
    return "audio/mpeg";
  }

  if (lowerPath.endsWith(".ogg")) {
    return "audio/ogg";
  }

  if (lowerPath.endsWith(".wav")) {
    return "audio/wav";
  }

  if (lowerPath.endsWith(".m4a") || lowerPath.endsWith(".aac")) {
    return "audio/mp4";
  }

  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }

  if (lowerPath.endsWith(".gif")) {
    return "image/gif";
  }

  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

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

    if (!shareLink || !shareLink.isActive) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "This link has expired", expired: true }, { status: 410 });
    }

    if (shareLink.passwordHash && !isLinkVerified(request, token)) {
      return NextResponse.json({ error: "Password required" }, { status: 401 });
    }

    const memory = shareLink.memory;

    if (!memory || !memory.encryptedFilePath || !memory.user?.encryptionKey) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const encryptedBuffer = getFile(memory.encryptedFilePath);
    const decryptedBuffer = decryptData(encryptedBuffer, memory.user.encryptionKey) as Buffer;
    const mimeType = resolveMimeType(memory.memoryType, memory.encryptedFilePath);

    return new Response(new Uint8Array(decryptedBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving shared media:", error);
    return NextResponse.json({ error: "Failed to serve media" }, { status: 500 });
  }
}
