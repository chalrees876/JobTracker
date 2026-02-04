import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnProtectedRoute =
    req.nextUrl.pathname.startsWith("/applications") ||
    req.nextUrl.pathname.startsWith("/profile");

  if (isOnProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect logged-in users away from login page
  if (req.nextUrl.pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/applications", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/applications/:path*", "/profile/:path*", "/login"],
};
