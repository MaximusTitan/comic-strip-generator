// src/middleware.ts or /middleware.ts (depending on your project structure)
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

// Configure routes where Clerk middleware should apply
export const config = {
  matcher: [
    "/((?!_next/image|_next/static|favicon.ico).*)",
    "/api/(.*)",
    "/auth/(.*)"
  ],
};
