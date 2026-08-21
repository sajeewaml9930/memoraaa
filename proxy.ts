import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  if (pathname === "/chats") {
    return NextResponse.redirect(new URL("/albums", request.url), 308);
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === "/login" || pathname === "/register") && token) {
    return NextResponse.redirect(new URL("/albums", request.url));
  }

  // Redirect unauthenticated users to login
  if (pathname.startsWith("/(dashboard)") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/register", "/chats", "/albums", "/archived", "/settings", "/album/:path*"],
};
