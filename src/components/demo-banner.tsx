/** Preview / partner-testing notice — set NEXT_PUBLIC_LOB_DEMO_MODE=true on Vercel. */
export function DemoBanner() {
  const demo = process.env.NEXT_PUBLIC_LOB_DEMO_MODE === "true";
  if (!demo) return null;

  const autoApprove = process.env.LOB_AUTO_APPROVE_CARRIERS === "true";

  return (
    <div className="border-b border-amber-200 bg-amber-100 px-4 py-2 text-center text-sm text-amber-950">
      <strong>Demo / preview</strong> — You are on a test build. Data may be reset. Share only with people you trust.
      {autoApprove && (
        <>
          {" "}
          Carriers are <strong>auto-approved</strong> on this environment (turn off for real customers).
        </>
      )}
    </div>
  );
}
