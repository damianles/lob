"use client";

import { useRouter } from "next/navigation";

import { useDisplayCurrencyPreference } from "@/components/providers/app-providers";
import { RadioChoice } from "@/components/ui/radio-choice";
import { DEFAULT_CAD_TO_USD_RATE } from "@/lib/money";
import type { DisplayCurrency } from "@/lib/display-currency";

/**
 * CAD-first display preference for Insights averages and mixed-currency summaries.
 * Individual loads still show their native currency (CA–CA = CAD, US–US = USD).
 */
export function DisplayCurrencyPreference({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrencyPreference();

  function onChange(c: DisplayCurrency) {
    setDisplayCurrency(c);
    router.refresh();
  }

  if (compact) {
    return (
      <RadioChoice
        label="Display currency"
        name="lob-display-currency-compact"
        value={displayCurrency}
        onChange={onChange}
        options={[
          { value: "CAD", label: "CAD" },
          { value: "USD", label: "USD" },
        ]}
        className="[&_label]:px-3 [&_label]:py-1.5 [&_label]:text-xs"
      />
    );
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-stone-50/80 p-4">
      <h2 className="text-sm font-semibold text-stone-900">Display currency</h2>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">
        LOB is CAD-first. Canada–Canada loads post and book in <strong>CAD</strong>; US–US loads stay in{" "}
        <strong>USD</strong>. This setting converts Insights averages and mixed summaries when you prefer the other
        unit (approx. {DEFAULT_CAD_TO_USD_RATE} CAD→USD).
      </p>
      <div className="mt-3">
        <RadioChoice
          label="Show mixed totals in"
          name="lob-profile-display-currency"
          value={displayCurrency}
          onChange={onChange}
          options={[
            { value: "CAD", label: "Canadian dollars" },
            { value: "USD", label: "US dollars" },
          ]}
          className="[&_label]:px-3 [&_label]:py-2 [&_label]:text-sm"
        />
      </div>
    </section>
  );
}
