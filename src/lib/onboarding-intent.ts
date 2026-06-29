/** Set from landing / sign-in; read on account setup to show the right flow only. */
export const LOB_ONBOARDING_INTENT_KEY = "lob_onboarding_intent";

export type LobOnboardingIntent = "carrier" | "shipper";

export function parseOnboardingIntent(raw: string | null | undefined): LobOnboardingIntent | null {
  if (raw === "carrier" || raw === "shipper") return raw;
  return null;
}
