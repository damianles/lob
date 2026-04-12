import { LobBrandLockup } from "@/components/lob-brand-lockup";

/** In-content wordmark — no boxed panel; blends with the workspace background. */
export function LobBrandStrip() {
  return (
    <div className="px-4 pt-5 pb-2 sm:px-6 sm:pt-6">
      <LobBrandLockup className="relative h-[4.75rem] w-full max-w-[min(100%,280px)] sm:h-[5.25rem]" />
    </div>
  );
}
