"use client";

type Option<T extends string> = { value: T; label: string; description?: string };

type Props<T extends string> = {
  label: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  className?: string;
};

/**
 * Accessible radio group — use for mi/km and other binary/small choice sets (Airbnb-style pill feel).
 */
export function RadioChoice<T extends string>({ label, name, value, onChange, options, className }: Props<T>) {
  return (
    <fieldset className={className}>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap items-center gap-4" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-center gap-2.5 rounded-full border px-3.5 py-2 text-sm transition ${
                selected
                  ? "border-lob-navy/30 bg-lob-navy/[0.06] text-lob-navy ring-1 ring-lob-navy/15"
                  : "border-stone-200/90 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={selected}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-lob-navy bg-lob-navy" : "border-stone-300 bg-white"
                }`}
                aria-hidden
              >
                {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
              </span>
              <span className="font-medium">{o.label}</span>
              {o.description ? <span className="hidden text-xs text-stone-500 sm:inline">{o.description}</span> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
