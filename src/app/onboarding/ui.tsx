"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

type FormState = {
  legalName: string;
  userName: string;
  userEmail: string;
  dotNumber: string;
  mcNumber: string;
  carrierType: "ASSET_BASED" | "BROKER";
};

const emptyState: FormState = {
  legalName: "",
  userName: "",
  userEmail: "",
  dotNumber: "",
  mcNumber: "",
  carrierType: "ASSET_BASED",
};

export function OnboardingForms() {
  const { isSignedIn } = useAuth();
  const [shipper, setShipper] = useState<FormState>(emptyState);
  const [carrier, setCarrier] = useState<FormState>(emptyState);
  const [message, setMessage] = useState("");

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
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Could not create seller account.");
      return;
    }
    setMessage(`Seller account ready: ${data.data.legalName}`);
    setShipper(emptyState);
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
  }

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <section className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        If you are already signed in with Clerk, this form links your signed-in user to the company you
        create. Name/email fields are still shown for fallback local testing.
      </section>
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Mill / wholesaler (post loads)</h2>
        <div className="mt-3 space-y-2">
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
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
            type="button"
            onClick={submitShipper}
          >
            Create seller account
          </button>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Trucking company (book loads)</h2>
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
            className="rounded bg-amber-600 px-4 py-2 text-sm text-white"
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

