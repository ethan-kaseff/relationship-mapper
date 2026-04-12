import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decode } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public routes
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.next();
  }

  // Read session cookie and decode directly (getToken has issues in next-auth v5 beta)
  const isSecure = request.url.startsWith("https://");
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const sessionCookie = request.cookies.get(cookieName)?.value;

  let token = null;
  if (sessionCookie) {
    try {
      token = await decode({
        token: sessionCookie,
        secret: process.env.AUTH_SECRET!,
        salt: cookieName,
      });
    } catch {
      // Invalid token — treat as unauthenticated
    }
  }

  // Redirect to landing page with login modal if not authenticated
  if (!token) {
    const loginUrl = new URL("/?login=true", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string | undefined;

  // Settings page: SYSTEM_ADMIN and OFFICE_ADMIN only
  if (pathname.startsWith("/settings")) {
    if (role !== "SYSTEM_ADMIN" && role !== "OFFICE_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // CONNECTOR role restrictions
  if (role === "CONNECTOR") {
    // UI pages: only dashboard and interactions
    if (!pathname.startsWith("/api/")) {
      if (pathname !== "/dashboard" && !pathname.startsWith("/interactions")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
    // API routes: only auth, connections, and lookup endpoints
    if (pathname.startsWith("/api/")) {
      const allowed =
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/connections") ||
        pathname.startsWith("/api/lookup");
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // VIEWER role restrictions
  if (role === "VIEWER") {
    // Block dashboard, events, settings — redirect to /people
    if (!pathname.startsWith("/api/")) {
      const allowed =
        pathname.startsWith("/people") ||
        pathname.startsWith("/partners") ||
        pathname.startsWith("/relationships") ||
        pathname.startsWith("/interactions") ||
        pathname.startsWith("/happenings");
      if (!allowed) {
        return NextResponse.redirect(new URL("/people", request.url));
      }
    }
    // API routes: allow GET only (except /api/auth which needs POST for session)
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
      if (request.method !== "GET") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login
     * - /api/auth (NextAuth routes)
     * - _next/static, _next/image, favicon.ico
     */
    "/((?!login|connect|api/auth|api/connect|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
