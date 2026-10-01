"use client";

import Link from "next/link";
import { useState } from "react";

import { lobWoodOutlineButtonClass, lobWoodPrimaryButtonClass } from "@/lib/lob-button-styles";

/** One verb, then the real fork: supplier and carrier use different setup forms. */
export function CreateAccountChoice() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${lobWoodPrimaryButtonClass} min-h-12 px-8`}
      >
        Create account
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <p className="text-center text-sm text-stone-600">Which side of the board are you on?</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/sign-up?lob_intent=shipper"
          className={`${lobWoodPrimaryButtonClass} min-h-12 flex-1 px-6`}
        >
          Supplier
        </Link>
        <Link
          href="/sign-up?lob_intent=carrier"
          className={`${lobWoodOutlineButtonClass} min-h-12 flex-1 px-6`}
        >
          Carrier
        </Link>
      </div>
    </div>
  );
}
