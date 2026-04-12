"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { LOB_ONBOARDING_INTENT_KEY } from "@/lib/onboarding-intent";

/** Persists `?lob_intent=carrier|shipper` for account setup scrolling. */
export function ClerkIntentBridge() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const raw = searchParams.get("lob_intent");
    if (raw === "carrier" || raw === "shipper") {
      sessionStorage.setItem(LOB_ONBOARDING_INTENT_KEY, raw);
    }
  }, [searchParams]);

  return null;
}
