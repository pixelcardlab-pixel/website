import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionToken } from "@/lib/admin-auth";

function isAllowedWithoutAuth(pathname) {
  return pathname === "/admin/login" || pathname === "/api/admin/login";
}

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  if (isAllowedWithoutAuth(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = getAdminSessionToken();
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value || "";
  const isAuthed = Boolean(sessionToken) && cookieValue === sessionToken;

  if (isAuthed) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search || ""}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};

