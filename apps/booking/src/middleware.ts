import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isOwner = pathname.startsWith("/owner");

  if (isAdmin || isOwner) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = (req.auth.user as { role?: string }).role;
    if (isAdmin && role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (isOwner && role !== "LODGE_OWNER" && role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*"],
};
