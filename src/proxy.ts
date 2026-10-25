import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/", "/tutors", "/auth/login", "/auth/register", "/health"];

  // Step 0 of the tutor journey: requirements are shown before an account exists.
  // /tutor/apply stays protected and is matched below.
  const isPublicTutorRequirements = pathname === "/tutor/requirements";

  // Allow access to auth pages without authentication check
  const isAuthPage = pathname.startsWith("/auth/");

  if (publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/")) || isAuthPage || isPublicTutorRequirements) {
    return NextResponse.next();
  }

  // /checkout is gated so the flow never sends a signed-out visitor into a form
  // whose submit would only 401. The chosen package rides in the query string,
  // so the callback keeps path and search together and sign-in returns to the
  // same selection instead of a bare checkout page.
  const protectedPaths = ["/tutor", "/admin", "/dashboard", "/checkout"];
  const isProtectedPath = protectedPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token");

  if (!accessToken) {
    const callbackUrl = encodeURIComponent(pathname + request.nextUrl.search);
    return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${callbackUrl}`, request.url));
  }

  return NextResponse.next();
}