import { useAuthStore } from "@/stores/authStore";
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const isAuthenticated = useAuthStore.getState().isAuthenticated;

  if (!isAuthenticated && url.pathname !== "/login") {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
