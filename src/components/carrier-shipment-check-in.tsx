"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DocumentUploadField } from "@/components/document-upload-field";
import { Button } from "@/components/ui/button";

export function CarrierShipmentCheckIn({
  loadId,
  referenceNumber,
  pickupConfirmedAt,
  deliveredAt,
  supplierDeliveredAt,
  signedBolFileUrl,
  mutualComplete,
}: {
  loadId: string;
  referenceNumber: string;
  pickupConfirmedAt: Date | null;
  deliveredAt: Date | null;
  supplierDeliveredAt: Date | null;
  signedBolFileUrl: string | null;
  mutualComplete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"pickup" | "delivery" | "bol" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [bolUrl, setBolUrl] = useState(signedBolFileUrl ?? "");
  const bolOnFile = Boolean(signedBolFileUrl?.trim());

  useEffect(() => {
    setBolUrl(signedBolFileUrl ?? "");
  }, [signedBolFileUrl]);

  async function post(path: "confirm-pickup" | "confirm-delivery", kind: "pickup" | "delivery") {
    if (kind === "delivery" && !bolOnFile) {
      setMessage("Upload the signed BOL before marking delivered.");
      return;
    }
    setBusy(kind);
    setMessage(null);
    const res = await fetch(`/api/loads/${loadId}/${path}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : `Could not mark ${kind}.`);
      return;
    }
    setMessage(kind === "pickup" ? "Marked picked up. Load is in transit." : "Marked delivered.");
    router.refresh();
  }

  async function saveBol() {
    if (!bolUrl.trim()) {
      setMessage("Add a signed BOL file or https link first.");
      return;
    }
    setBusy("bol");
    setMessage(null);
    const res = await fetch(`/api/loads/${loadId}/signed-bol`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: bolUrl.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessage(typeof data.error === "string" ? data.error : "Could not save signed BOL.");
      return;
    }
    setMessage("Signed BOL saved. You can mark delivered.");
    router.refresh();
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Carrier check-in</h2>
        <p className="mt-1 text-xs text-zinc-600">
          1) Mark picked up. 2) Upload the signed BOL. 3) Mark delivered. The supplier then confirms the load is
          complete.
        </p>
        {message ? <p className="mt-2 text-sm text-zinc-700">{message}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {!pickupConfirmedAt ? (
            <Button
              type="button"
              size="sm"
              disabled={busy != null}
              isLoading={busy === "pickup"}
              onClick={() => void post("confirm-pickup", "pickup")}
            >
              Mark picked up
            </Button>
          ) : (
            <p className="w-full text-xs font-medium text-emerald-800">
              Picked up {pickupConfirmedAt.toLocaleString()}
            </p>
          )}
          {pickupConfirmedAt && !deliveredAt ? (
            <Button
              type="button"
              size="sm"
              disabled={busy != null || !bolOnFile}
              isLoading={busy === "delivery"}
              onClick={() => void post("confirm-delivery", "delivery")}
            >
              Mark delivered
            </Button>
          ) : null}
          {pickupConfirmedAt && !deliveredAt && !bolOnFile ? (
            <p className="w-full text-xs text-amber-900">Signed BOL required before you can mark delivered.</p>
          ) : null}
          {deliveredAt ? (
            <p className="w-full text-xs font-medium text-emerald-800">
              You marked delivered {deliveredAt.toLocaleString()}
              {supplierDeliveredAt
                ? ` · Supplier confirmed complete ${supplierDeliveredAt.toLocaleString()}`
                : " · Waiting on supplier to confirm complete"}
            </p>
          ) : null}
        </div>
        {mutualComplete ? (
          <p className="mt-3 text-xs">
            Load complete.{" "}
            <Link href={`/loads/${loadId}/invoice`} className="font-semibold text-lob-navy underline">
              Open completion invoice
            </Link>
          </p>
        ) : null}
      </div>

      {pickupConfirmedAt ? (
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Signed BOL (required)</h2>
          <p className="mt-1 text-xs text-zinc-600">
            Upload the signed bill of lading (PDF or photo) before marking delivered. It stays on the completion
            invoice.
          </p>
          <div className="mt-3">
            <DocumentUploadField
              label="Signed BOL file"
              kind="SIGNED_BOL"
              value={bolUrl}
              onChange={setBolUrl}
              required
              helpText="Upload if Blob storage is enabled, or paste an https link."
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={busy != null || !bolUrl.trim()}
            isLoading={busy === "bol"}
            onClick={() => void saveBol()}
          >
            {bolOnFile ? "Update signed BOL" : "Save signed BOL"}
          </Button>
          {signedBolFileUrl ? (
            <p className="mt-2 text-xs text-emerald-800">
              On file:{" "}
              <a href={signedBolFileUrl} className="underline" target="_blank" rel="noopener noreferrer">
                open signed BOL
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="sr-only">{referenceNumber}</p>
    </section>
  );
}
