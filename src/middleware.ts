import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = ["/", "/tutors", "/auth/login", "/auth/register", "/health"];
  const tutorPaths = ["/tutor"];
  const adminPaths = ["/admin"];

  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
  const isTutorPath = tutorPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));
  const isAdminPath = adminPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));

  if (isPublicPath) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token");

  if (!accessToken) {
    const callbackUrl = encodeURIComponent(pathname);
    let redirectPath = "/auth/login";

    if (isAdminPath) {
      redirectPath = "/auth/login";
    } else if (isTutorPath) {
      redirectPath = "/auth/login";
    }

    return NextResponse.redirect(new URL(`${redirectPath}?callbackUrl=${callbackUrl}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/tutor/:path*",
    "/admin/:path*",
    "/auth/:path*",
  ],
};