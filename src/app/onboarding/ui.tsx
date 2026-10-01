"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { DocumentUploadField } from "@/components/document-upload-field";
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

type AuthorityRegion = "US" | "CA" | "BOTH";

type FormState = {
  legalName: string;
  userName: string;
  userEmail: string;
  businessPhone: string;
  remittanceEmail: string;
  billingAddress: string;
  authorityRegion: AuthorityRegion;
  dotNumber: string;
  mcNumber: string;
  caBusinessNumber: string;
  caSafetyNumber: string;
  caSafetyProvince: string;
  carrierType: "ASSET_BASED" | "BROKER";
  isOwnerOperator: boolean;
  brokerAttested: boolean;
  w9Url: string;
  businessRegistrationUrl: string;
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
  remittanceEmail: "",
  billingAddress: "",
  authorityRegion: "US",
  dotNumber: "",
  mcNumber: "",
  caBusinessNumber: "",
  caSafetyNumber: "",
  caSafetyProvince: "",
  carrierType: "ASSET_BASED",
  isOwnerOperator: false,
  brokerAttested: false,
  w9Url: "",
  businessRegistrationUrl: "",
  creditReferenceUrl: "",
  creditReviewAuthorized: false,
  insuranceUrl: "",
  insuranceExpiresAt: "",
};

const emptyShipper: ShipperFormState = {
  ...emptyState,
  supplierKind: "MILL",
  acronym: "",
};

function isHttpsLink(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-600">{title}</legend>
      {children}
    </fieldset>
  );
}

function creditPacketReady(
  form: FormState,
  opts: { requireInsurance: boolean; requireW9: boolean; requireBusinessReg: boolean },
): string | null {
  if (opts.requireW9) {
    if (!form.w9Url.trim()) return "A W-9 upload or https link is required.";
    if (!isHttpsLink(form.w9Url)) return "W-9 must be a full https:// link.";
  }
  if (opts.requireBusinessReg) {
    if (!form.businessRegistrationUrl.trim() && !form.w9Url.trim()) {
      return "Upload business registration / Canadian tax form (or a W-9 if you have one).";
    }
    if (form.businessRegistrationUrl.trim() && !isHttpsLink(form.businessRegistrationUrl)) {
      return "Business registration must be a full https:// link.";
    }
  }
  if (!form.creditReferenceUrl.trim()) return "A credit reference upload or https link is required.";
  if (!isHttpsLink(form.creditReferenceUrl)) return "Credit reference must be a full https:// link.";
  if (!form.creditReviewAuthorized) {
    return "Authorize the other company to view these documents after a booking.";
  }
  if (opts.requireInsurance) {
    if (!form.insuranceUrl.trim()) return "A certificate of insurance upload is required.";
    if (!isHttpsLink(form.insuranceUrl)) return "Insurance must be a full https:// link.";
    if (!form.insuranceExpiresAt) return "Insurance expiry is required.";
  }
  return null;
}

function CreditDocuments({
  form,
  showInsurance,
  requireW9,
  showBusinessReg,
  onChange,
}: {
  form: FormState;
  showInsurance: boolean;
  requireW9: boolean;
  showBusinessReg: boolean;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <FormSection title="Documents">
      <p className="text-xs leading-relaxed text-zinc-600">
        Prefer PDF or image upload. Use an external link only for factoring portals or when upload is unavailable.
      </p>
      {requireW9 ? (
        <DocumentUploadField
          label="W-9"
          kind="W9"
          value={form.w9Url}
          onChange={(url) => onChange({ w9Url: url })}
          required
        />
      ) : null}
      {showBusinessReg ? (
        <DocumentUploadField
          label="Business registration / tax form"
          kind="BUSINESS_REGISTRATION"
          value={form.businessRegistrationUrl}
          onChange={(url) => onChange({ businessRegistrationUrl: url })}
          required={!form.w9Url}
          helpText="Canadian BN registration, GST/HST, or provincial business registration PDF."
        />
      ) : null}
      <DocumentUploadField
        label="Credit reference"
        kind="CREDIT_REFERENCE"
        value={form.creditReferenceUrl}
        onChange={(url) => onChange({ creditReferenceUrl: url })}
        required
        acceptExternalLink
        helpText="Acceptable: trade reference letter, factoring approval page, or bank/credit application PDF. Not a personal Drive folder of unrelated files."
      />
      {showInsurance ? (
        <>
          <DocumentUploadField
            label="Certificate of insurance"
            kind="INSURANCE"
            value={form.insuranceUrl}
            onChange={(url) => onChange({ insuranceUrl: url })}
            required
            helpText="Should show auto liability and cargo. Add LOB or the mill as certificate holder if your broker requires it."
          />
          <label className="block text-xs font-medium text-zinc-600">
            Insurance expiry *
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
        <span>After a booking, the other company may view these documents.</span>
      </label>
    </FormSection>
  );
}

function RegionSelect({
  value,
  onChange,
  label,
}: {
  value: AuthorityRegion;
  onChange: (v: AuthorityRegion) => void;
  label: string;
}) {
  return (
    <label className="block text-xs font-medium text-zinc-600">
      {label}
      <select
        className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
        value={value}
        onChange={(e) => onChange(e.target.value as AuthorityRegion)}
      >
        <option value="US">United States</option>
        <option value="CA">Canada</option>
        <option value="BOTH">Both US and Canada</option>
      </select>
    </label>
  );
}

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
    void fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { realRole?: string | null } | null) => {
        if (body?.realRole) setRealRole(body.realRole);
      })
      .catch(() => undefined);
  }, []);

  function chooseIntent(next: LobOnboardingIntent) {
    persistIntent(next);
    setIntent(next);
  }

  function switchIntent(next: LobOnboardingIntent) {
    persistIntent(next);
    setIntent(next);
    setMessage("");
  }

  async function submitShipper() {
    if (!shipper.legalName.trim()) {
      setMessage("Supplier company name is required.");
      return;
    }
    if (!shipper.acronym.trim() || shipper.acronym.trim().length < 2) {
      setMessage("Load ref acronym (2–3 letters) is required.");
      return;
    }
    if (!shipper.businessPhone.trim() || shipper.businessPhone.trim().length < 7) {
      setMessage("Business phone is required.");
      return;
    }
    if (!shipperLegal) {
      setMessage("Accept the Terms, Privacy Policy, and Supplier Agreement to continue.");
      return;
    }
    const region = shipper.authorityRegion;
    const packetError = creditPacketReady(shipper, {
      requireInsurance: false,
      requireW9: region === "US" || region === "BOTH",
      requireBusinessReg: region === "CA" || region === "BOTH",
    });
    if (packetError) {
      setMessage(packetError);
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
        acronym: shipper.acronym.trim().toUpperCase(),
        userName: shipper.userName,
        userEmail: shipper.userEmail,
        role: "SHIPPER",
        supplierKind: shipper.supplierKind,
        authorityRegion: shipper.authorityRegion,
        businessPhone: shipper.businessPhone.trim(),
        remittanceEmail: shipper.remittanceEmail.trim() || undefined,
        billingAddress: shipper.billingAddress.trim() || undefined,
        w9Url: shipper.w9Url.trim() || undefined,
        businessRegistrationUrl: shipper.businessRegistrationUrl.trim() || undefined,
        creditReferenceUrl: shipper.creditReferenceUrl.trim(),
        creditReviewAuthorized: true,
        legalAcceptances: shipperLegal,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(
        typeof data.error === "string"
          ? data.error
          : data.error
            ? JSON.stringify(data.error)
            : "Could not create supplier account.",
      );
      return;
    }
    const approved = data.data?.verificationStatus === "APPROVED";
    setMessage(
      approved
        ? `Supplier account ready: ${data.data.legalName}. You can post loads now.`
        : `Supplier account created: ${data.data.legalName}. LOB must approve your company before you can post loads.`,
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
    if (!carrier.businessPhone.trim() || carrier.businessPhone.trim().length < 7) {
      setMessage("Business phone is required so mills and LOB can reach your dispatch.");
      return;
    }
    const region = carrier.authorityRegion;
    if (region === "US" || region === "BOTH") {
      if (!carrier.dotNumber.trim()) {
        setMessage("DOT number is required for US authority.");
        return;
      }
      if (!carrier.mcNumber.trim()) {
        setMessage("MC number is required for US authority.");
        return;
      }
    }
    if (region === "CA" || region === "BOTH") {
      if (!carrier.caBusinessNumber.trim()) {
        setMessage("Canadian business number (BN) is required.");
        return;
      }
      if (!carrier.caSafetyNumber.trim() || !carrier.caSafetyProvince.trim()) {
        setMessage("NSC/CVOR (or equivalent) number and province are required.");
        return;
      }
    }
    if (carrier.carrierType === "BROKER" && !carrier.brokerAttested) {
      setMessage("Brokers must attest responsibility for the asset carrier they tender.");
      return;
    }
    if (!carrierLegal) {
      setMessage("Accept the Terms, Privacy Policy, and Carrier Agreement to continue.");
      return;
    }
    const packetError = creditPacketReady(carrier, {
      requireInsurance: true,
      requireW9: region === "US" || region === "BOTH",
      requireBusinessReg: region === "CA" || region === "BOTH",
    });
    if (packetError) {
      setMessage(packetError);
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
        authorityRegion: carrier.authorityRegion,
        dotNumber: carrier.dotNumber || undefined,
        mcNumber: carrier.mcNumber || undefined,
        caBusinessNumber: carrier.caBusinessNumber || undefined,
        caSafetyNumber: carrier.caSafetyNumber || undefined,
        caSafetyProvince: carrier.caSafetyProvince || undefined,
        carrierType: carrier.carrierType,
        isOwnerOperator: carrier.isOwnerOperator,
        brokerAttested: carrier.carrierType === "BROKER" ? true : undefined,
        role: "DISPATCHER",
        businessPhone: carrier.businessPhone.trim(),
        billingAddress: carrier.billingAddress.trim() || undefined,
        w9Url: carrier.w9Url.trim() || undefined,
        businessRegistrationUrl: carrier.businessRegistrationUrl.trim() || undefined,
        creditReferenceUrl: carrier.creditReferenceUrl.trim(),
        creditReviewAuthorized: true,
        insuranceUrl: carrier.insuranceUrl.trim(),
        insuranceExpiresAt: new Date(`${carrier.insuranceExpiresAt}T12:00:00.000Z`).toISOString(),
        legalAcceptances: carrierLegal,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(
        typeof data.error === "string"
          ? data.error
          : data.error
            ? JSON.stringify(data.error)
            : "Carrier onboarding failed.",
      );
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

  const shipperNeedsW9 = shipper.authorityRegion === "US" || shipper.authorityRegion === "BOTH";
  const shipperNeedsCaDocs = shipper.authorityRegion === "CA" || shipper.authorityRegion === "BOTH";
  const carrierNeedsUs = carrier.authorityRegion === "US" || carrier.authorityRegion === "BOTH";
  const carrierNeedsCa = carrier.authorityRegion === "CA" || carrier.authorityRegion === "BOTH";

  return (
    <div className="mt-6 space-y-6">
      {isAdminTester && (
        <section className="rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950">
          <p className="font-semibold text-amber-950">Signed in as LOB admin</p>
          <p className="mt-1 leading-relaxed">
            Both forms are shown for testing. Submitting either links <strong>this</strong> login to the new company.
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
              <span className="block font-semibold text-lob-navy">Supplier</span>
              <span className="mt-1 block text-xs text-zinc-600">Mill, wholesaler, or lumber shipper</span>
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg border-2 border-emerald-700/20 bg-emerald-50/80 px-4 py-4 text-left transition hover:border-emerald-700/40"
              onClick={() => chooseIntent("carrier")}
            >
              <span className="block font-semibold text-emerald-900">Carrier</span>
              <span className="mt-1 block text-xs text-zinc-600">Asset, broker, or owner-operator</span>
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-1">
        {showShipperForm && (
          <section
            id="onboarding-shipper"
            className={cn(
              "scroll-mt-24 space-y-4 rounded-lg border bg-white p-4",
              intent === "shipper" && !isAdminTester && "ring-2 ring-lob-navy/30 ring-offset-2 ring-offset-stone-50",
            )}
          >
            <div>
              <h2 className="text-lg font-semibold text-lob-navy">Supplier — post loads</h2>
              <p className="mt-1 text-xs text-zinc-600">Company details, tax documents, then agreements.</p>
              {!isAdminTester && intent === "shipper" && (
                <p className="mt-2 text-xs text-zinc-500">
                  Need to book loads instead?{" "}
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
            </div>

            <FormSection title="Company">
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
              <RegionSelect
                label="Tax / operating region"
                value={shipper.authorityRegion}
                onChange={(authorityRegion) => setShipper((s) => ({ ...s, authorityRegion }))}
              />
              <label className="block text-xs font-medium text-zinc-600">
                Company name *
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  value={shipper.legalName}
                  onChange={(e) => setShipper((s) => ({ ...s, legalName: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Load ref acronym (2–3 letters) *
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
                Business phone *
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
                AP / remittance email <span className="font-normal text-zinc-500">(optional)</span>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  type="email"
                  placeholder="ap@mill.example"
                  value={shipper.remittanceEmail}
                  onChange={(e) => setShipper((s) => ({ ...s, remittanceEmail: e.target.value }))}
                />
                <span className="mt-1 block font-normal text-zinc-500">
                  Where carriers or LOB can send payment follow-up after a haul.
                </span>
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Billing address <span className="font-normal text-zinc-500">(optional)</span>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  placeholder="Street, city, province/state"
                  value={shipper.billingAddress}
                  onChange={(e) => setShipper((s) => ({ ...s, billingAddress: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Your name
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  value={shipper.userName}
                  onChange={(e) => setShipper((s) => ({ ...s, userName: e.target.value }))}
                  required={!isSignedIn}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Email
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  type="email"
                  value={shipper.userEmail}
                  onChange={(e) => setShipper((s) => ({ ...s, userEmail: e.target.value }))}
                  required={!isSignedIn}
                />
              </label>
            </FormSection>

            <CreditDocuments
              form={shipper}
              showInsurance={false}
              requireW9={shipperNeedsW9}
              showBusinessReg={shipperNeedsCaDocs}
              onChange={(patch) => setShipper((s) => ({ ...s, ...patch }))}
            />

            <FormSection title="Agreements">
              <OnboardingLegalAccept key={`shipper-legal-${legalEpoch}`} role="SHIPPER" onChange={setShipperLegal} />
            </FormSection>

            <button
              className={`${lobWoodPrimaryButtonClass} w-full justify-center sm:w-auto`}
              type="button"
              onClick={submitShipper}
              disabled={!shipperLegal}
            >
              Create supplier account
            </button>
          </section>
        )}

        {showCarrierForm && (
          <section
            id="onboarding-carrier"
            className={cn(
              "scroll-mt-24 space-y-4 rounded-lg border bg-white p-4",
              intent === "carrier" && !isAdminTester && "ring-2 ring-emerald-600/40 ring-offset-2 ring-offset-stone-50",
            )}
          >
            <div>
              <h2 className="text-lg font-semibold text-emerald-900">Carrier — book loads</h2>
              <p className="mt-1 text-xs text-zinc-600">
                Company and authority first, then insurance and credit docs, then agreements.
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
            </div>

            <FormSection title="Company">
              <label className="block text-xs font-medium text-zinc-600">
                Company name *
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  value={carrier.legalName}
                  onChange={(e) => setCarrier((s) => ({ ...s, legalName: e.target.value }))}
                  required
                />
              </label>
              <RegionSelect
                label="Operating authority region"
                value={carrier.authorityRegion}
                onChange={(authorityRegion) => setCarrier((s) => ({ ...s, authorityRegion }))}
              />
              {carrierNeedsUs ? (
                <>
                  <label className="block text-xs font-medium text-zinc-600">
                    DOT number *
                    <input
                      className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                      value={carrier.dotNumber}
                      onChange={(e) => setCarrier((s) => ({ ...s, dotNumber: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="block text-xs font-medium text-zinc-600">
                    MC number *
                    <input
                      className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                      value={carrier.mcNumber}
                      onChange={(e) => setCarrier((s) => ({ ...s, mcNumber: e.target.value }))}
                      required
                    />
                  </label>
                </>
              ) : null}
              {carrierNeedsCa ? (
                <>
                  <label className="block text-xs font-medium text-zinc-600">
                    Canadian business number (BN) *
                    <input
                      className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                      value={carrier.caBusinessNumber}
                      onChange={(e) => setCarrier((s) => ({ ...s, caBusinessNumber: e.target.value }))}
                      required
                    />
                  </label>
                  <div className="flex gap-2">
                    <label className="block w-20 text-xs font-medium text-zinc-600">
                      Prov *
                      <input
                        className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal uppercase"
                        maxLength={2}
                        value={carrier.caSafetyProvince}
                        onChange={(e) =>
                          setCarrier((s) => ({ ...s, caSafetyProvince: e.target.value.toUpperCase() }))
                        }
                        required
                      />
                    </label>
                    <label className="block min-w-0 flex-1 text-xs font-medium text-zinc-600">
                      NSC / CVOR / safety # *
                      <input
                        className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                        value={carrier.caSafetyNumber}
                        onChange={(e) => setCarrier((s) => ({ ...s, caSafetyNumber: e.target.value }))}
                        required
                      />
                    </label>
                  </div>
                </>
              ) : null}
              <label className="block text-xs font-medium text-zinc-600">
                Service type
                <select
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={carrier.carrierType}
                  onChange={(e) =>
                    setCarrier((s) => ({
                      ...s,
                      carrierType: e.target.value as "ASSET_BASED" | "BROKER",
                      brokerAttested: e.target.value === "BROKER" ? s.brokerAttested : false,
                    }))
                  }
                >
                  <option value="ASSET_BASED">Asset-based — we run our own trucks</option>
                  <option value="BROKER">Broker — we arrange third-party trucks</option>
                </select>
              </label>
              {carrier.carrierType === "BROKER" ? (
                <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={carrier.brokerAttested}
                    onChange={(e) => setCarrier((s) => ({ ...s, brokerAttested: e.target.checked }))}
                  />
                  <span>
                    I am responsible for the asset carrier I tender and will not misrepresent authority.
                  </span>
                </label>
              ) : null}
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
                    Suppliers see this tag after they book. You still book and dispatch as a carrier.
                  </span>
                </span>
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Business phone *
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
                Billing address <span className="font-normal text-zinc-500">(optional)</span>
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  placeholder="Street, city, province/state"
                  value={carrier.billingAddress}
                  onChange={(e) => setCarrier((s) => ({ ...s, billingAddress: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Your name
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  value={carrier.userName}
                  onChange={(e) => setCarrier((s) => ({ ...s, userName: e.target.value }))}
                  required={!isSignedIn}
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Email
                <input
                  className="mt-1 w-full rounded border px-3 py-2 text-sm font-normal"
                  type="email"
                  value={carrier.userEmail}
                  onChange={(e) => setCarrier((s) => ({ ...s, userEmail: e.target.value }))}
                  required={!isSignedIn}
                />
              </label>
            </FormSection>

            <CreditDocuments
              form={carrier}
              showInsurance
              requireW9={carrierNeedsUs}
              showBusinessReg={carrierNeedsCa}
              onChange={(patch) => setCarrier((s) => ({ ...s, ...patch }))}
            />

            <FormSection title="Agreements">
              <OnboardingLegalAccept
                key={`carrier-legal-${legalEpoch}`}
                role="DISPATCHER"
                onChange={setCarrierLegal}
              />
            </FormSection>

            <button
              className={`${lobWoodPrimaryButtonClass} w-full justify-center sm:w-auto`}
              type="button"
              onClick={submitCarrier}
              disabled={!carrierLegal}
            >
              Submit carrier application
            </button>
          </section>
        )}
      </div>

      {message && (
        <section className="rounded-lg border border-zinc-300 bg-zinc-100 p-3 text-sm">{message}</section>
      )}
    </div>
  );
}
