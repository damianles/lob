"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { lobWoodPrimaryButtonClass } from "@/lib/lob-button-styles";
import { cn } from "@/lib/cn";
import { LOB_ONBOARDING_INTENT_KEY } from "@/lib/onboarding-intent";
import { useViewerRole } from "@/components/providers/app-providers";

type FormState = {
  legalName: string;
  userName: string;
  userEmail: string;
  dotNumber: string;
  mcNumber: string;
  carrierType: "ASSET_BASED" | "BROKER";
};

type ShipperFormState = FormState & {
  supplierKind: "MILL" | "WHOLESALER" | "OTHER";
};

const emptyState: FormState = {
  legalName: "",
  userName: "",
  userEmail: "",
  dotNumber: "",
  mcNumber: "",
  carrierType: "ASSET_BASED",
};

const emptyShipper: ShipperFormState = {
  ...emptyState,
  supplierKind: "MILL",
};

export function OnboardingForms() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const { refresh: refreshViewerRole } = useViewerRole();
  const [realRole, setRealRole] = useState<string | null>(null);
  const [shipper, setShipper] = useState<ShipperFormState>(emptyShipper);
  const [carrier, setCarrier] = useState<FormState>(emptyState);
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(LOB_ONBOARDING_INTENT_KEY);
    setIntent(raw);
    if (raw === "carrier") {
      document.getElementById("onboarding-carrier")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (raw === "shipper") {
      document.getElementById("onboarding-shipper")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) {
      setRealRole(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { realRole?: string | null } | null) => {
        if (!cancelled && d?.realRole) setRealRole(d.realRole);
      })
      .catch(() => {
        if (!cancelled) setRealRole(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  async function submitShipper() {
    if (!shipper.legalName.trim()) {
      setMessage("Company name is required (mill, wholesaler, or reload).");
      return;
    }
    if (!isSignedIn && !shipper.userName.trim()) {
      setMessage("Your name is required when you are not signed in.");
      return;
    }
    if (!isSignedIn && !shipper.userEmail.trim()) {
      setMessage("Your email is required when you are not signed in.");
      return;
    }

    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legalName: shipper.legalName,
        userName: shipper.userName,
        userEmail: shipper.userEmail,
        role: "SHIPPER",
        supplierKind: shipper.supplierKind,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Could not create supplier account.");
      return;
    }
    setMessage(`Supplier account ready: ${data.data.legalName}`);
    setShipper(emptyShipper);
    refreshViewerRole();
    router.refresh();
  }

  async function submitCarrier() {
    if (!carrier.legalName.trim()) {
      setMessage("Carrier company name is required.");
      return;
    }
    if (!carrier.dotNumber.trim()) {
      setMessage("DOT number is required for carriers.");
      return;
    }
    if (!carrier.mcNumber.trim()) {
      setMessage("MC number is required for carriers.");
      return;
    }
    if (!isSignedIn && !carrier.userName.trim()) {
      setMessage("Your name is required when you are not signed in.");
      return;
    }
    if (!isSignedIn && !carrier.userEmail.trim()) {
      setMessage("Your email is required when you are not signed in.");
      return;
    }

    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legalName: carrier.legalName,
        userName: carrier.userName,
        userEmail: carrier.userEmail,
        dotNumber: carrier.dotNumber || undefined,
        mcNumber: carrier.mcNumber || undefined,
        carrierType: carrier.carrierType,
        role: "DISPATCHER",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Carrier onboarding failed.");
      return;
    }
    setMessage(`Carrier submitted for review: ${data.data.legalName}`);
    setCarrier(emptyState);
    refreshViewerRole();
    router.refresh();
  }

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      {realRole === "ADMIN" && (
        <section className="md:col-span-2 rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950">
          <p className="font-semibold text-amber-950">Signed in as LOB admin</p>
          <p className="mt-1 leading-relaxed">
            Submitting either form links <strong>this</strong> login to the new company. Use Test lab →{" "}
            <em>Admin only</em> to switch back when done testing.
          </p>
        </section>
      )}
      <section className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        If you are already signed in with Clerk, this form links your signed-in user to the company you
        create. Name/email fields are still shown for fallback local testing.
      </section>
      {intent === "carrier" && (
        <section className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50/95 p-4 text-sm text-emerald-950">
          <p className="font-semibold text-emerald-950">You chose carrier registration</p>
          <p className="mt-1 leading-relaxed">
            Complete only the <strong>Carrier — book loads</strong> column (DOT and MC required). The supplier column is
            for mills and wholesalers — it does not apply to trucking companies.
          </p>
        </section>
      )}
      {intent === "shipper" && (
        <section className="md:col-span-2 rounded-lg border border-[#dde2ec] bg-[#eef1f7] p-4 text-sm text-lob-navy">
          <p className="font-semibold">You chose supplier registration</p>
          <p className="mt-1 leading-relaxed">
            Complete only the <strong>Supplier — post loads</strong> column. Carrier onboarding (DOT/MC) is separate —
            use the carrier flow if you move freight instead of posting lumber loads.
          </p>
        </section>
      )}
      <section
        id="onboarding-shipper"
        className={cn(
          "scroll-mt-24 rounded-lg border bg-white p-4",
          intent === "shipper" && "ring-2 ring-lob-navy/35 ring-offset-2 ring-offset-stone-50",
        )}
      >
        <h2 className="text-lg font-semibold text-lob-navy">Supplier — post loads</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Mills, wholesalers, and reloads that publish loads. This is not the carrier application — carriers book loads,
          they do not pick a supplier type.
        </p>
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-zinc-600">
            Supplier type
            <select
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              value={shipper.supplierKind}
              onChange={(e) =>
                setShipper((s) => ({ ...s, supplierKind: e.target.value as ShipperFormState["supplierKind"] }))
              }
            >
              <option value="MILL">Mill</option>
              <option value="WHOLESALER">Wholesaler</option>
              <option value="OTHER">Other lumber supplier</option>
            </select>
          </label>
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Company name"
            value={shipper.legalName}
            onChange={(e) => setShipper((s) => ({ ...s, legalName: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Your name"
            value={shipper.userName}
            onChange={(e) => setShipper((s) => ({ ...s, userName: e.target.value }))}
            required={!isSignedIn}
          />
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Email"
            value={shipper.userEmail}
            onChange={(e) => setShipper((s) => ({ ...s, userEmail: e.target.value }))}
            required={!isSignedIn}
          />
          <button
            className={`${lobWoodPrimaryButtonClass} w-full justify-center sm:w-auto`}
            type="button"
            onClick={submitShipper}
          >
            Create supplier account
          </button>
        </div>
      </section>

      <section
        id="onboarding-carrier"
        className={cn(
          "scroll-mt-24 rounded-lg border bg-white p-4",
          intent === "carrier" && "ring-2 ring-emerald-600/40 ring-offset-2 ring-offset-stone-50",
        )}
      >
        <h2 className="text-lg font-semibold text-emerald-900">Carrier — book loads</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Trucking company (asset or broker). This path gives you dispatcher tools — not supplier posting. Ignore supplier
          type above unless you also operate as a mill or wholesaler on LOB.
        </p>
        <div className="mt-3 space-y-2">
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Company name"
            value={carrier.legalName}
            onChange={(e) => setCarrier((s) => ({ ...s, legalName: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Your name"
            value={carrier.userName}
            onChange={(e) => setCarrier((s) => ({ ...s, userName: e.target.value }))}
            required={!isSignedIn}
          />
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="Email"
            value={carrier.userEmail}
            onChange={(e) => setCarrier((s) => ({ ...s, userEmail: e.target.value }))}
            required={!isSignedIn}
          />
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="DOT number"
            value={carrier.dotNumber}
            onChange={(e) => setCarrier((s) => ({ ...s, dotNumber: e.target.value }))}
            required
          />
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="MC number"
            value={carrier.mcNumber}
            onChange={(e) => setCarrier((s) => ({ ...s, mcNumber: e.target.value }))}
            required
          />
          <select
            className="w-full rounded border px-3 py-2 text-sm"
            value={carrier.carrierType}
            onChange={(e) =>
              setCarrier((s) => ({
                ...s,
                carrierType: e.target.value as "ASSET_BASED" | "BROKER",
              }))
            }
          >
            <option value="ASSET_BASED">Asset-based carrier</option>
            <option value="BROKER">Broker</option>
          </select>
          <button
            className={`${lobWoodPrimaryButtonClass} w-full justify-center sm:w-auto`}
            type="button"
            onClick={submitCarrier}
          >
            Submit carrier application
          </button>
        </div>
      </section>

      {message && (
        <section className="md:col-span-2 rounded-lg border border-zinc-300 bg-zinc-100 p-3 text-sm">
          {message}
        </section>
      )}
    </div>
  );
}

