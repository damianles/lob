"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

/** Honors `?redirect_url=/path` after successful sign-in. */
export function SignInWithRedirect() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("redirect_url")?.trim();
  const fallback = raw && raw.startsWith("/") ? raw : "/";

  return <SignIn forceRedirectUrl={fallback} />;
}
