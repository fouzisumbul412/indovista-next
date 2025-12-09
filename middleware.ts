import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");

  if (!token && isDashboard) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      if (req.nextUrl.pathname.startsWith("/dashboard/settings")) {
        if (decoded.role !== "SUPER_ADMIN" && decoded.role !== "ADMIN") {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }
    } catch {
      // Invalid token, force login
      if (isDashboard) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
