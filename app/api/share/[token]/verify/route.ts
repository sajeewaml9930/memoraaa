import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { comparePassword } from "@/app/lib/encryption";

const SHARE_COOKIE_PREFIX = "memoraa_share_";

function getVerifiedCookieName(token: string) {
  return `${SHARE_COOKIE_PREFIX}${token}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";

    const shareLink = await prisma.sharedMemoryLink.findUnique({
      where: { token },
      include: { memory: true },
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

    if (!shareLink.passwordHash) {
      const response = NextResponse.json({ success: true, requiresPassword: false });
      response.cookies.set({
        name: getVerifiedCookieName(token),
        value: "verified",
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });
      return response;
    }

    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    const isValidPassword = await comparePassword(password, shareLink.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, requiresPassword: false });
    response.cookies.set({
      name: getVerifiedCookieName(token),
      value: "verified",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Error verifying share password:", error);
    return NextResponse.json({ error: "Failed to verify password" }, { status: 500 });
  }
}
