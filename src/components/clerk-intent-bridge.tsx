"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { LOB_ONBOARDING_INTENT_KEY, parseOnboardingIntent } from "@/lib/onboarding-intent";

/** Persists `?lob_intent=carrier|shipper` so account setup shows one form only. */
export function ClerkIntentBridge() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const intent = parseOnboardingIntent(searchParams.get("lob_intent"));
    if (intent) {
      sessionStorage.setItem(LOB_ONBOARDING_INTENT_KEY, intent);
    }
  }, [searchParams]);

  return null;
}
