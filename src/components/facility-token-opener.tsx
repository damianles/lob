"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FacilityTokenOpener({
  kind,
}: {
  kind: "pickup" | "delivery";
}) {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open() {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Paste the link or the token from the QR.");
      return;
    }
    const fromUrl = trimmed.match(/\/facility\/(?:pickup|delivery)\/([A-Za-z0-9_-]+)/i);
    const token = fromUrl?.[1] ?? trimmed.replace(/[^A-Za-z0-9_-]/g, "");
    if (token.length < 8) {
      setError("That does not look like a pickup/delivery token.");
      return;
    }
    setError(null);
    router.push(`/facility/${kind}/${token}`);
  }

  return (
    <form
      className="mt-6 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        open();
      }}
    >
      <label className="block text-sm font-medium text-zinc-800">
        Paste the {kind} link or token
        <input
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`/facility/${kind}/…`}
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        className="rounded-lg bg-lob-navy px-4 py-2 text-sm font-semibold text-white hover:bg-lob-navy-hover"
      >
        Open {kind} page
      </button>
    </form>
  );
}
