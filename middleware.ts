import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = "your_jwt_secret";

import { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token =
    request.cookies.get("token") || request.headers.get("Authorization");

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    try {
      if (typeof token === "string") {
        jwt.verify(token, JWT_SECRET);
      } else {
        throw new Error("Invalid token");
      }
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}
