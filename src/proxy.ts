import { NextResponse } from "next/server";
import { auth, checkApiToken } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname === "/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    if (checkApiToken(req.headers.get("authorization"))) {
      return NextResponse.next();
    }
    if (req.auth) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    if (pathname !== "/") loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
