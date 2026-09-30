"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OnboardingLegalAccept } from "@/components/onboarding-legal-accept";
import { useViewerRole } from "@/components/providers/app-providers";
import { cn } from "@/lib/cn";
import type { LegalAcceptancePayload } from "@/lib/legal/documents";
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
  businessPhone: string;
  billingAddress: string;
  dotNumber: string;
  mcNumber: string;
  carrierType: "ASSET_BASED" | "BROKER";
  isOwnerOperator: boolean;
  w9Url: string;
  creditReferenceUrl: string;
  creditReviewAuthorized: boolean;
  insuranceUrl: string;
  insuranceExpiresAt: string;
};

type ShipperFormState = FormState & {
  supplierKind: "MILL" | "WHOLESALER" | "OTHER";
  acronym: string;
};

const emptyState: FormState = {
  legalName: "",
  userName: "",
  userEmail: "",
  businessPhone: "",
  billingAddress: "",
  dotNumber: "",
  mcNumber: "",
  carrierType: "ASSET_BASED",
  isOwnerOperator: false,
  w9Url: "",
  creditReferenceUrl: "",
  creditReviewAuthorized: false,
  insuranceUrl: "",
  insuranceExpiresAt: "",
};

function isHttpsLink(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

function creditPacketReady(form: FormState, opts: { requireInsurance: boolean }): string | null {
  if (!form.w9Url.trim()) return "A W-9 https link is required.";
  if (!isHttpsLink(form.w9Url)) return "W-9 must be a full https:// link.";
  if (!form.creditReferenceUrl.trim()) return "A credit reference https link is required.";
  if (!isHttpsLink(form.creditReferenceUrl)) return "Credit reference must be a full https:// link.";
  if (!form.creditReviewAuthorized) {
    return "Authorize the company you book with to review this credit file.";
  }
  if (opts.requireInsurance) {
    if (!form.insuranceUrl.trim()) return "A certificate of insurance https link is required.";
    if (!isHttpsLink(form.insuranceUrl)) return "Insurance must be a full https:// link.";
    if (!form.insuranceExpiresAt) return "Insurance expiry is required.";
  }
  return null;
}

function CreditPacketFields({
  form,
  showInsurance,
  onChange,
}: {
  form: FormState;
  showInsurance: boolean;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <fieldset className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/80 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Credit file</legend>
      <p className="text-xs leading-relaxed text-zinc-600">
        Host PDFs on your own secure storage and paste full https links. Credit reference may be a factoring portal URL.
      </p>
      <label className="block text-xs font-medium text-zinc-600">
        W-9 (https link)
        <input
          className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm font-normal"
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={form.w9Url}
          onChange={(e) => onChange({ w9Url: e.target.value })}
          required
        />
      </label>
      <label className="block text-xs font-medium text-zinc-600">
        Credit reference (https link)
        <input
          className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm font-normal"
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={form.creditReferenceUrl}
          onChange={(e) => onChange({ creditReferenceUrl: e.target.value })}
          required
        />
      </label>
      {showInsurance ? (
        <>
          <label className="block text-xs font-medium text-zinc-600">
            Certificate of insurance (https link)
            <input
              className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm font-normal"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={form.insuranceUrl}
              onChange={(e) => onChange({ insuranceUrl: e.target.value })}
              required
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Insurance expiry
            <input
              className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm font-normal"
              type="date"
              value={form.insuranceExpiresAt}
              onChange={(e) => onChange({ insuranceExpiresAt: e.target.value })}
              required
            />
          </label>
        </>
      ) : null}
      <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.creditReviewAuthorized}
          onChange={(e) => onChange({ creditReviewAuthorized: e.target.checked })}
        />
        <span>The company I book with may open this file.</span>
      </label>
    </fieldset>
  );
}

const emptyShipper: ShipperFormState = {
  ...emptyState,
  supplierKind: "MILL",
  acronym: "",
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
  const [shipperLegal, setShipperLegal] = useState<LegalAcceptancePayload[] | null>(null);
  const [carrierLegal, setCarrierLegal] = useState<LegalAcceptancePayload[] | null>(null);
  const [legalEpoch, setLegalEpoch] = useState(0);

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
    const acronym = shipper.acronym.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,3}$/.test(acronym)) {
      setMessage("Enter a 2–3 letter company acronym for load references (e.g. NRL).");
      return;
    }
    if (!shipper.businessPhone.trim() || shipper.businessPhone.trim().length < 7) {
      setMessage("Business phone is required so carriers and LOB can reach your mill.");
      return;
    }
    const packetError = creditPacketReady(shipper, { requireInsurance: false });
    if (packetError) {
      setMessage(packetError);
      return;
    }
    if (!shipperLegal) {
      setMessage("Accept the Terms, Privacy Policy, and Supplier Agreement to continue.");
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
        acronym,
        userName: shipper.userName,
        userEmail: shipper.userEmail,
        businessPhone: shipper.businessPhone.trim(),
        billingAddress: shipper.billingAddress.trim() || undefined,
        w9Url: shipper.w9Url.trim(),
        creditReferenceUrl: shipper.creditReferenceUrl.trim(),
        creditReviewAuthorized: true,
        role: "SHIPPER",
        supplierKind: shipper.supplierKind,
        legalAcceptances: shipperLegal,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : data.error ? JSON.stringify(data.error) : "Could not create supplier account.");
      return;
    }
    const approved = data.data?.verificationStatus === "APPROVED";
    setMessage(
      approved
        ? `Supplier account ready: ${data.data.legalName}. You can post loads now.`
        : `Supplier account created: ${data.data.legalName}. LOB must approve your company before you can post loads — we'll review your registration soon.`,
    );
    setShipper(emptyShipper);
    setShipperLegal(null);
    setLegalEpoch((n) => n + 1);
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
    if (!carrier.businessPhone.trim() || carrier.businessPhone.trim().length < 7) {
      setMessage("Business phone is required so mills and LOB can reach your dispatch.");
      return;
    }
    const packetError = creditPacketReady(carrier, { requireInsurance: true });
    if (packetError) {
      setMessage(packetError);
      return;
    }
    if (!carrierLegal) {
      setMessage("Accept the Terms, Privacy Policy, and Carrier Agreement to continue.");
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
        businessPhone: carrier.businessPhone.trim(),
        billingAddress: carrier.billingAddress.trim() || undefined,
        dotNumber: carrier.dotNumber || undefined,
        mcNumber: carrier.mcNumber || undefined,
        carrierType: carrier.carrierType,
        isOwnerOperator: carrier.isOwnerOperator,
        w9Url: carrier.w9Url.trim(),
        creditReferenceUrl: carrier.creditReferenceUrl.trim(),
        creditReviewAuthorized: true,
        insuranceUrl: carrier.insuranceUrl.trim(),
        insuranceExpiresAt: new Date(`${carrier.insuranceExpiresAt}T12:00:00.000Z`).toISOString(),
        role: "DISPATCHER",
        legalAcceptances: carrierLegal,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : data.error ? JSON.stringify(data.error) : "Carrier onboarding failed.");
      return;
    }
    setMessage(`Carrier submitted for review: ${data.data.legalName}`);
    setCarrier(emptyState);
    setCarrierLegal(null);
    setLegalEpoch((n) => n + 1);
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
              <label className="block text-xs font-medium text-zinc-600">
                Load ref acronym (2–3 letters)
                <input
                  className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm uppercase tracking-wider"
                  placeholder="e.g. NRL"
                  maxLength={3}
                  value={shipper.acronym}
                  onChange={(e) =>
                    setShipper((s) => ({
                      ...s,
                      acronym: e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3),
                    }))
                  }
                  required
                />
                <span className="mt-1 block font-normal text-zinc-500">
                  {`Appears on every load as LOB-${shipper.acronym.trim().toUpperCase() || "XXX"}-YY-NNNN`}
                </span>
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Business phone
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  type="tel"
                  placeholder="250-555-0100"
                  value={shipper.businessPhone}
                  onChange={(e) => setShipper((s) => ({ ...s, businessPhone: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Billing address (optional)
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  placeholder="Street, city, province/state"
                  value={shipper.billingAddress}
                  onChange={(e) => setShipper((s) => ({ ...s, billingAddress: e.target.value }))}
                />
              </label>
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
              <CreditPacketFields
                form={shipper}
                showInsurance={false}
                onChange={(patch) => setShipper((s) => ({ ...s, ...patch }))}
              />
              <OnboardingLegalAccept key={`shipper-legal-${legalEpoch}`} role="SHIPPER" onChange={setShipperLegal} />
              <button
                className={`${lobWoodPrimaryButtonClass} w-full justify-center sm:w-auto`}
                type="button"
                onClick={submitShipper}
                disabled={!shipperLegal}
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
              One carrier account for every service provider. Tell us if you run trucks, broker freight, or operate as
              an owner-operator — suppliers see that tag after they book.
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
              <label className="block text-xs font-medium text-zinc-600">
                Business phone
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  type="tel"
                  placeholder="503-555-0199"
                  value={carrier.businessPhone}
                  onChange={(e) => setCarrier((s) => ({ ...s, businessPhone: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Billing address (optional)
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  placeholder="Street, city, province/state"
                  value={carrier.billingAddress}
                  onChange={(e) => setCarrier((s) => ({ ...s, billingAddress: e.target.value }))}
                />
              </label>
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
                aria-label="Service provider type"
              >
                <option value="ASSET_BASED">Asset-based — we run our own trucks</option>
                <option value="BROKER">Broker — we arrange third-party trucks</option>
              </select>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={carrier.isOwnerOperator}
                  onChange={(e) => setCarrier((s) => ({ ...s, isOwnerOperator: e.target.checked }))}
                />
                <span>
                  <span className="font-medium">Owner-operator / single-truck</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    Suppliers see this instead of asset/broker. You still book and dispatch as a carrier.
                  </span>
                </span>
              </label>
              <CreditPacketFields
                form={carrier}
                showInsurance
                onChange={(patch) => setCarrier((s) => ({ ...s, ...patch }))}
              />
              <OnboardingLegalAccept
                key={`carrier-legal-${legalEpoch}`}
                role="DISPATCHER"
                onChange={setCarrierLegal}
              />
              <button
                className={`${lobWoodPrimaryButtonClass} w-full justify-center sm:w-auto`}
                type="button"
                onClick={submitCarrier}
                disabled={!carrierLegal}
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
