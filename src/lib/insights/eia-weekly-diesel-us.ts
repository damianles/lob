/**
 * U.S. Energy Information Administration — weekly **retail** No. 2 diesel (national average).
 * Free API key: https://www.eia.gov/opendata/
 *
 * Facets follow EIA’s `petroleum/pri/gnd` dataset (gasoline & diesel retail prices).
 */

export type EiaWeeklyDieselUs =
  | {
      ok: true;
      usdPerGallon: number;
      period: string;
      seriesDescription: string;
      provider: "EIA";
      documentationUrl: string;
    }
  | { ok: false; reason: "not_configured" | "http_error" | "api_error" | "no_rows" };

type EiaV2Rows = {
  response?: {
    data?: Array<{
      period?: string;
      value?: number | null;
      "product-name"?: string;
      duoarea?: string;
    }>;
  };
  error?: string | { code?: string; message?: string };
};

const EIA_DOC = "https://www.eia.gov/opendata/";

export async function fetchUsNationalWeeklyDieselRetail(): Promise<EiaWeeklyDieselUs> {
  const apiKey = process.env.EIA_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "not_configured" };
  }

  const url = new URL("https://api.eia.gov/v2/petroleum/pri/gnd/data/");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", "weekly");
  url.searchParams.append("data[0]", "value");
  /** Most recent weekly observation */
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("length", "3");
  /** No. 2 diesel retail, U.S. national — see EIA browser for facet IDs if this drifts */
  url.searchParams.append("facets[product][]", "EPD2D");
  url.searchParams.append("facets[duoarea][]", "NUS");

  let res: Response;
  try {
    res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  } catch {
    return { ok: false, reason: "http_error" };
  }

  let json: EiaV2Rows;
  try {
    json = (await res.json()) as EiaV2Rows;
  } catch {
    return { ok: false, reason: "http_error" };
  }

  if (!res.ok) {
    return { ok: false, reason: "http_error" };
  }
  if (json.error) {
    return { ok: false, reason: "api_error" };
  }

  const row = json.response?.data?.find((r) => typeof r.value === "number" && Number.isFinite(r.value!));
  if (!row?.value || !row.period) {
    return { ok: false, reason: "no_rows" };
  }

  return {
    ok: true,
    usdPerGallon: row.value,
    period: row.period,
    seriesDescription: "Weekly U.S. No. 2 diesel retail price (national average)",
    provider: "EIA",
    documentationUrl: EIA_DOC,
  };
}
