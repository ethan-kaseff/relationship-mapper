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
  const viewAllOffices = request.cookies.get("viewAllOffices")?.value === "true";

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

  // Cross-office restriction: non-SYSTEM_ADMIN in "All Offices" mode — relationship data only
  if (viewAllOffices && role !== "SYSTEM_ADMIN" && role !== "VIEWER" && role !== "CONNECTOR") {
    if (!pathname.startsWith("/api/")) {
      const allowed =
        pathname.startsWith("/people") ||
        pathname.startsWith("/partners") ||
        pathname.startsWith("/relationships");
      if (!allowed) {
        return NextResponse.redirect(new URL("/people", request.url));
      }
    }
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
      // Block all writes in cross-office mode
      if (request.method !== "GET") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Block certain read-only APIs too
      const blockedApis =
        pathname.startsWith("/api/connections") ||
        pathname.startsWith("/api/happenings") ||
        pathname.startsWith("/api/events") ||
        pathname.startsWith("/api/fundraisers");
      if (blockedApis) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // VIEWER role restrictions — relationship data only
  if (role === "VIEWER") {
    if (!pathname.startsWith("/api/")) {
      const allowed =
        pathname.startsWith("/people") ||
        pathname.startsWith("/partners") ||
        pathname.startsWith("/relationships");
      if (!allowed) {
        return NextResponse.redirect(new URL("/people", request.url));
      }
    }
    // API routes: block all writes and block non-relationship endpoints
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
      if (request.method !== "GET") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      // Block interaction, happening, event, fundraiser API reads
      const blockedApis =
        pathname.startsWith("/api/connections") ||
        pathname.startsWith("/api/happenings") ||
        pathname.startsWith("/api/events") ||
        pathname.startsWith("/api/fundraisers");
      if (blockedApis) {
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
    "/((?!login|connect(?!ions)|donate|api/auth|api/connect(?!ion)|api/donate|api/webhooks|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
