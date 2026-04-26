import { randomUUID } from "node:crypto";
import { LoadCarrierVisibilityMode, Prisma, RateObservationSource } from "@prisma/client";
import { NextResponse } from "next/server";

import { canonicalCityKey } from "@/lib/city-canonical";
import { BULK_MAX_ROWS, parseAllRows, parseCsv, type BulkRowResult } from "@/lib/csv-bulk-load";
import {
  findLaneBenchmark,
  normalizeEquipmentForBenchmark,
  offeredAmountUsdEquivalent,
  validateOfferedRateAgainstBenchmark,
  zip5ForBenchmark,
} from "@/lib/market-rate-lane";
import { parseRequestedPickupAt } from "@/lib/parse-pickup-date";
import { prisma } from "@/lib/prisma";
import { getActorContext } from "@/lib/request-context";
import { extractLumberSpec, lumberSpecToLoadColumns } from "@/lib/lumber-spec";

/**
 * Bulk load creation from CSV. Only shippers can use this.
 *
 * Two-step UX:
 *   1) Client uploads CSV text via this endpoint with `?mode=validate`. We parse,
 *      validate every row, and return a per-row result. Nothing is written.
 *   2) Client re-uploads with `?mode=commit` to actually create loads. Invalid
 *      rows are skipped; we return per-row create results.
 *
 * This stops anyone from polluting the DB with malformed data — every row
 * is validated by the shared `parseBulkLoadRow()` (uses the same Zod schemas
 * as the single-load endpoint).
 */
export async function POST(req: Request) {
  const actor = await getActorContext();
  if (!actor.companyId || !actor.userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (actor.role !== "SHIPPER") {
    return NextResponse.json({ error: "Only supplier accounts can post loads." }, { status: 403 });
  }

  const url = new URL(req.url);
  const mode = (url.searchParams.get("mode") ?? "validate") as "validate" | "commit";

  let csvText: string;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.csv !== "string") {
      return NextResponse.json({ error: "Expected JSON body { csv: string }." }, { status: 400 });
    }
    csvText = body.csv;
  } else {
    csvText = await req.text();
  }

  const { headers, rows } = parseCsv(csvText);
  if (headers.length === 0 || rows.length === 0) {
    return NextResponse.json({ error: "CSV is empty or has no data rows." }, { status: 400 });
  }

  const parsed = parseAllRows(rows);

  // Cross-upload idempotency: any externalRef already used by this shipper
  // shouldn't be written twice. Mark conflicting rows as failed up front.
  const wantedRefs = parsed
    .filter((r): r is Extract<BulkRowResult, { ok: true }> => r.ok && Boolean(r.data.externalRef))
    .map((r) => r.data.externalRef as string);

  if (wantedRefs.length) {
    const existing = await prisma.load.findMany({
      where: {
        shipperCompanyId: actor.companyId!,
        externalRef: { in: wantedRefs },
      },
      select: { externalRef: true },
    });
    const taken = new Set(existing.map((e) => e.externalRef!));
    if (taken.size) {
      for (let i = 0; i < parsed.length; i++) {
        const r = parsed[i];
        if (!r.ok) continue;
        if (r.data.externalRef && taken.has(r.data.externalRef)) {
          parsed[i] = {
            ok: false,
            rowIndex: r.rowIndex,
            errors: [
              `externalRef "${r.data.externalRef}" already used by an earlier load — re-upload skipped (idempotent).`,
            ],
            raw: rows[i] ?? {},
          };
        }
      }
    }
  }

  const validRows = parsed.filter((r): r is Extract<BulkRowResult, { ok: true }> => r.ok);
  const invalidRows = parsed.filter((r): r is Extract<BulkRowResult, { ok: false }> => !r.ok);

  if (mode === "validate") {
    return NextResponse.json({
      mode,
      totalRows: parsed.length,
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      maxRows: BULK_MAX_ROWS,
      truncated: rows.length > BULK_MAX_ROWS,
      results: parsed,
    });
  }

  // commit mode
  const results: Array<
    | { ok: true; rowIndex: number; loadId: string; referenceNumber: string }
    | { ok: false; rowIndex: number; errors: string[] }
  > = [];

  for (const v of parsed) {
    if (!v.ok) {
      results.push({ ok: false, rowIndex: v.rowIndex, errors: v.errors });
      continue;
    }
    const p = v.data;

    const pickupAt = parseRequestedPickupAt(p.requestedPickupAt);
    if (!pickupAt) {
      results.push({
        ok: false,
        rowIndex: v.rowIndex,
        errors: ["requestedPickupAt invalid (use YYYY-MM-DD or ISO datetime)"],
      });
      continue;
    }

    const rateCheck = await validateOfferedRateAgainstBenchmark({
      originState: p.originState,
      destinationState: p.destinationState,
      originZip: p.originZip,
      destinationZip: p.destinationZip,
      originCity: p.originCity,
      destinationCity: p.destinationCity,
      equipmentType: p.equipmentType,
      offeredRateUsd: p.offeredRateUsd,
      offerCurrency: p.offerCurrency,
    });
    if (!rateCheck.ok) {
      results.push({ ok: false, rowIndex: v.rowIndex, errors: [rateCheck.message] });
      continue;
    }

    const hit = await findLaneBenchmark(
      p.originState,
      p.destinationState,
      p.originZip,
      p.destinationZip,
      p.equipmentType,
      p.originCity,
      p.destinationCity,
    );
    const marketRateUsd =
      hit?.row.benchmarkAvgUsd != null ? new Prisma.Decimal(hit.row.benchmarkAvgUsd) : undefined;
    const rateUsdEq = offeredAmountUsdEquivalent(p.offeredRateUsd, p.offerCurrency);

    const lumberSpec = extractLumberSpec(p.extendedPosting);
    const lumberColumns = lumberSpecToLoadColumns(lumberSpec);

    try {
      const row = await prisma.load.create({
        data: {
          referenceNumber: `LOB-${randomUUID().slice(0, 8).toUpperCase()}`,
          externalRef: p.externalRef ?? null,
          originCity: p.originCity,
          originState: p.originState.toUpperCase(),
          originZip: p.originZip,
          destinationCity: p.destinationCity,
          destinationState: p.destinationState.toUpperCase(),
          destinationZip: p.destinationZip,
          weightLbs: p.weightLbs,
          equipmentType: p.equipmentType,
          isRush: p.isRush,
          isPrivate: p.isPrivate,
          offerCurrency: p.offerCurrency,
          offeredRateUsd: p.offeredRateUsd,
          marketRateUsd,
          shipperCompanyId: actor.companyId!,
          createdByUserId: actor.userId!,
          uniquePickupCode: randomUUID().slice(0, 6).toUpperCase(),
          requestedPickupAt: pickupAt,
          carrierVisibilityMode: LoadCarrierVisibilityMode.OPEN,
          extendedPosting: p.extendedPosting
            ? (p.extendedPosting as Prisma.InputJsonValue)
            : undefined,
          ...lumberColumns,
          laneRateObservation: {
            create: {
              observedAt: new Date(),
              originState: p.originState.toUpperCase().slice(0, 2),
              destState: p.destinationState.toUpperCase().slice(0, 2),
              originCityCanon: canonicalCityKey(p.originCity),
              destCityCanon: canonicalCityKey(p.destinationCity),
              originZip5: zip5ForBenchmark(p.originZip),
              destZip5: zip5ForBenchmark(p.destinationZip),
              equipmentNorm: normalizeEquipmentForBenchmark(p.equipmentType),
              rateUsd: new Prisma.Decimal(rateUsdEq.toFixed(2)),
              offerCurrency: p.offerCurrency,
              source: RateObservationSource.APP,
            },
          },
        },
      });
      results.push({
        ok: true,
        rowIndex: v.rowIndex,
        loadId: row.id,
        referenceNumber: row.referenceNumber,
      });
    } catch (e) {
      let message = "Unknown DB error";
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        // Unique constraint on (shipperCompanyId, externalRef) — race with a
        // concurrent upload. Treat as idempotency hit, not a hard failure.
        message = p.externalRef
          ? `externalRef "${p.externalRef}" already exists for this shipper (idempotent skip)`
          : "Duplicate row caught by DB unique constraint";
      } else if (e instanceof Error) {
        message = e.message;
      }
      results.push({
        ok: false,
        rowIndex: v.rowIndex,
        errors: [message],
      });
    }
  }

  return NextResponse.json({
    mode,
    totalRows: parsed.length,
    created: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
