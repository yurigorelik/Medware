import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Protect admin routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // Protect doctor routes - allow DOCTOR and BOTH roles
    if (path.startsWith("/doctor") && token?.role !== "DOCTOR" && token?.role !== "BOTH") {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // Protect patient routes - allow PATIENT and BOTH roles
    if (path.startsWith("/patient") && token?.role !== "PATIENT" && token?.role !== "BOTH") {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/doctor/:path*", "/patient/:path*", "/admin/:path*"],
};
