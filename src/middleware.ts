// src/middleware.ts or /middleware.ts (depending on your project structure)
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

// Configure routes where Clerk middleware should apply
export const config = {
  matcher: [
    "/((?!_next/image|_next/static|favicon.ico).*)",
    "/api/(.*)",
    "/auth/(.*)",
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ],
};
