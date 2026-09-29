import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/", "/tutors", "/auth/login", "/auth/register", "/health"];
  
  // Allow access to auth pages without authentication check
  const isAuthPage = pathname.startsWith("/auth/");
  
  if (publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/")) || isAuthPage) {
    return NextResponse.next();
  }

  const protectedPaths = ["/tutor", "/admin", "/dashboard"];
  const isProtectedPath = protectedPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token");

  if (!accessToken) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${callbackUrl}`, request.url));
  }

  return NextResponse.next();
}