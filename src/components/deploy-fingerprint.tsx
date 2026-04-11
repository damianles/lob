/** Confirms which Git commit Vercel built (server-only env). */
export function DeployFingerprint() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!sha) return null;
  return (
    <p className="border-b border-zinc-100 bg-zinc-50 py-1 text-center text-[10px] text-zinc-400">
      Build <span className="font-mono text-zinc-500">{sha.slice(0, 7)}</span>
      {process.env.VERCEL_ENV ? ` · ${process.env.VERCEL_ENV}` : ""}
    </p>
  );
}
