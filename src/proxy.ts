import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Attach the Clerk session to every matched request. Do not call auth.protect()
 * here — Next.js prefetches sidebar Links, and a protect() redirect on those
 * requests is what sent signed-in users to /sign-in when they clicked a tab.
 * Pages and API routes already check the session themselves.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
