"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

/** Honors `?redirect_url=/path` after successful sign-up (e.g. from guest nav). */
export function SignUpWithRedirect() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("redirect_url")?.trim();
  const fallback = raw && raw.startsWith("/") ? raw : "/";

  return <SignUp forceRedirectUrl={fallback} />;
}
