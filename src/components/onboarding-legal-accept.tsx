"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  LEGAL_DOCUMENTS,
  requiredLegalKeysForRole,
  type LegalAcceptancePayload,
  type LegalDocumentKey,
} from "@/lib/legal/documents";

export function OnboardingLegalAccept({
  role,
  onChange,
}: {
  role: "SHIPPER" | "DISPATCHER";
  onChange: (accepted: LegalAcceptancePayload[] | null) => void;
}) {
  const keys = useMemo(() => requiredLegalKeysForRole(role), [role]);
  const [checked, setChecked] = useState<Partial<Record<LegalDocumentKey, boolean>>>({});

  function toggle(key: LegalDocumentKey, value: boolean) {
    const next = { ...checked, [key]: value };
    setChecked(next);
    const allOk = keys.every((k) => next[k]);
    if (!allOk) {
      onChange(null);
      return;
    }
    onChange(
      keys.map((k) => ({
        documentKey: k,
        documentVersion: LEGAL_DOCUMENTS[k].version,
      })),
    );
  }

  return (
    <fieldset className="mt-4 space-y-3 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">
        Legal agreements
      </legend>
      <p className="text-xs text-zinc-600">
        Required to create your account. Documents are draft until counsel finalizes — versions are recorded when you
        accept.
      </p>
      {keys.map((key) => {
        const doc = LEGAL_DOCUMENTS[key];
        return (
          <label key={key} className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              className="mt-1"
              checked={Boolean(checked[key])}
              onChange={(e) => toggle(key, e.target.checked)}
            />
            <span>
              I agree to the{" "}
              <Link
                href={`/legal/${doc.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-lob-navy underline"
              >
                {doc.title.replace(/^Lumber One Board — /, "")}
              </Link>
              <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                Version {doc.version}
                {doc.isDraft ? " · draft" : ""}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
