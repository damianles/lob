import { LobBrandLockup } from "@/components/lob-brand-lockup";

/** One full wordmark per page — place under the app header in main content. */
export function LobBrandStrip() {
  return (
    <div className="border-b border-stone-200 bg-white px-4 py-3">
      <LobBrandLockup className="h-auto w-auto max-w-[min(100%,240px)]" />
    </div>
  );
}
