"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useViewerRole } from "@/components/providers/app-providers";
import { cn } from "@/lib/cn";
import { lobWoodPrimaryButtonClass } from "@/lib/lob-button-styles";
import {
  LOB_ONBOARDING_INTENT_KEY,
  parseOnboardingIntent,
  type LobOnboardingIntent,
} from "@/lib/onboarding-intent";

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

function persistIntent(next: LobOnboardingIntent) {
  sessionStorage.setItem(LOB_ONBOARDING_INTENT_KEY, next);
}

export function OnboardingForms() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const { refresh: refreshViewerRole } = useViewerRole();
  const [realRole, setRealRole] = useState<string | null>(null);
  const [shipper, setShipper] = useState<ShipperFormState>(emptyShipper);
  const [carrier, setCarrier] = useState<FormState>(emptyState);
  const [message, setMessage] = useState("");
  const [intent, setIntent] = useState<LobOnboardingIntent | null>(null);
  const [intentReady, setIntentReady] = useState(false);

  const isAdminTester = realRole === "ADMIN";
  const showShipperForm = isAdminTester || intent === "shipper";
  const showCarrierForm = isAdminTester || intent === "carrier";
  const needsIntentPicker = intentReady && !isAdminTester && intent === null;

  useEffect(() => {
    const fromUrl = parseOnboardingIntent(new URLSearchParams(window.location.search).get("lob_intent"));
    if (fromUrl) {
      persistIntent(fromUrl);
      setIntent(fromUrl);
      setIntentReady(true);
      return;
    }
    setIntent(parseOnboardingIntent(sessionStorage.getItem(LOB_ONBOARDING_INTENT_KEY)));
    setIntentReady(true);
  }, []);

  useEffect(() => {
    if (!intentReady || isAdminTester) return;
    if (intent === "carrier") {
      document.getElementById("onboarding-carrier")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (intent === "shipper") {
      document.getElementById("onboarding-shipper")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [intent, intentReady, isAdminTester]);

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

  function chooseIntent(next: LobOnboardingIntent) {
    persistIntent(next);
    setIntent(next);
  }

  function switchIntent(next: LobOnboardingIntent) {
    chooseIntent(next);
    setMessage("");
  }

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
    const approved = data.data?.verificationStatus === "APPROVED";
    setMessage(
      approved
        ? `Supplier account ready: ${data.data.legalName}. You can post loads now.`
        : `Supplier account created: ${data.data.legalName}. LOB must approve your company before you can post loads — we'll review your registration soon.`,
    );
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

  if (!intentReady) {
    return <p className="mt-6 text-sm text-zinc-600">Loading…</p>;
  }

  return (
    <div className="mt-6 space-y-6">
      {isAdminTester && (
        <section className="rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950">
          <p className="font-semibold text-amber-950">Signed in as LOB admin</p>
          <p className="mt-1 leading-relaxed">
            Both forms are shown for testing. Submitting either links <strong>this</strong> login to the new company. Use
            Test lab → <em>Admin only</em> to switch back when done.
          </p>
        </section>
      )}

      {needsIntentPicker && (
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Which type of account do you need?</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Suppliers post loads; carriers book them. Pick one — you will only see the form for your side.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="flex-1 rounded-lg border-2 border-lob-navy/20 bg-[#eef1f7] px-4 py-4 text-left transition hover:border-lob-navy/40"
              onClick={() => chooseIntent("shipper")}
            >
              <span className="font-semibold text-lob-navy">Supplier</span>
              <span className="mt-1 block text-sm text-zinc-600">Mill, wholesaler, or reload — post loads</span>
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg border-2 border-emerald-600/25 bg-emerald-50/80 px-4 py-4 text-left transition hover:border-emerald-600/45"
              onClick={() => chooseIntent("carrier")}
            >
              <span className="font-semibold text-emerald-900">Carrier</span>
              <span className="mt-1 block text-sm text-zinc-600">Asset fleet or broker — book loads</span>
            </button>
          </div>
        </section>
      )}

      {!needsIntentPicker && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          If you are already signed in with Clerk, this form links your signed-in user to the company you create.
          Name/email fields are still shown for fallback local testing.
        </section>
      )}

      <div
        className={cn(
          "grid gap-6",
          isAdminTester && showShipperForm && showCarrierForm ? "md:grid-cols-2" : "max-w-xl",
        )}
      >
        {showShipperForm && (
          <section
            id="onboarding-shipper"
            className={cn(
              "scroll-mt-24 rounded-lg border bg-white p-4",
              intent === "shipper" && !isAdminTester && "ring-2 ring-lob-navy/35 ring-offset-2 ring-offset-stone-50",
            )}
          >
            <h2 className="text-lg font-semibold text-lob-navy">Supplier — post loads</h2>
            <p className="mt-1 text-xs text-zinc-600">
              Mills, wholesalers, and reloads that publish loads on LOB.
            </p>
            {!isAdminTester && intent === "shipper" && (
              <p className="mt-2 text-xs text-zinc-500">
                Registered as a carrier by mistake?{" "}
                <button
                  type="button"
                  className="font-medium text-lob-navy underline"
                  onClick={() => switchIntent("carrier")}
                >
                  Switch to carrier registration
                </button>
                .
              </p>
            )}
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
        )}

        {showCarrierForm && (
          <section
            id="onboarding-carrier"
            className={cn(
              "scroll-mt-24 rounded-lg border bg-white p-4",
              intent === "carrier" && !isAdminTester && "ring-2 ring-emerald-600/40 ring-offset-2 ring-offset-stone-50",
            )}
          >
            <h2 className="text-lg font-semibold text-emerald-900">Carrier — book loads</h2>
            <p className="mt-1 text-xs text-zinc-600">
              Trucking company (asset-based fleet or broker). DOT and MC are required.
            </p>
            {!isAdminTester && intent === "carrier" && (
              <p className="mt-2 text-xs text-zinc-500">
                Need to post loads instead?{" "}
                <button
                  type="button"
                  className="font-medium text-emerald-800 underline"
                  onClick={() => switchIntent("shipper")}
                >
                  Switch to supplier registration
                </button>
                .
              </p>
            )}
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
        )}
      </div>

      {message && (
        <section className="rounded-lg border border-zinc-300 bg-zinc-100 p-3 text-sm">{message}</section>
      )}
    </div>
  );
}
