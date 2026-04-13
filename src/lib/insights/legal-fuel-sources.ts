/**
 * Curated **legal** diesel-pricing paths (no retail-app scraping).
 * Use these for compliance review and integration planning.
 */
export type LegalFuelSource = {
  id: string;
  /** Human label in UI */
  name: string;
  publisher: string;
  /** How often values refresh */
  cadence: string;
  geography: string;
  /** What you get (benchmark vs truck-stop) */
  offers: string;
  /** Typical integration */
  integration: "http_api" | "bulk_download" | "commercial_api" | "manual_table";
  documentationUrl: string;
};

export const LEGAL_DIESEL_DATA_SOURCES: LegalFuelSource[] = [
  {
    id: "eia-pri-gnd",
    name: "EIA — U.S. retail gasoline & diesel (weekly)",
    publisher: "U.S. Energy Information Administration (federal)",
    cadence: "Weekly (Mondays / holiday-adjusted)",
    geography: "U.S. national, PADD regions, select states",
    offers: "Official **average retail** No. 2 diesel (USD/gal) — not individual truck stops.",
    integration: "http_api",
    documentationUrl: "https://www.eia.gov/opendata/",
  },
  {
    id: "nrcan-weekly",
    name: "NRCan — Canadian weekly retail fuel prices",
    publisher: "Natural Resources Canada",
    cadence: "Weekly",
    geography: "Canada (national / regional summaries)",
    offers: "Government **survey averages** for diesel and gasoline (CAD) — not station-level.",
    integration: "bulk_download",
    documentationUrl: "https://natural-resources.canada.ca/energy/energy-sources-distribution/prices/weekly-prices/24008",
  },
  {
    id: "statcan-1810",
    name: "Statistics Canada — Table 18-10-0001-01 (weekly prices)",
    publisher: "Statistics Canada",
    cadence: "Weekly",
    geography: "Selected Canadian cities / regions",
    offers: "Published **retail index-style** fuel prices; use SDMX/CSV exports under license terms on StatCan site.",
    integration: "bulk_download",
    documentationUrl: "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000101",
  },
  {
    id: "opis-rack",
    name: "OPIS / Dow Jones — rack & retail benchmarks",
    publisher: "OPIS (IHS Markit / commercial)",
    cadence: "Daily / intraday (product-dependent)",
    geography: "U.S. & Canada markets",
    offers: "Contracted **rack, spot, and index** prices; common for TMS and fuel programs.",
    integration: "commercial_api",
    documentationUrl: "https://www.opis.com/",
  },
  {
    id: "fleet-card",
    name: "Fleet card & truck-stop networks",
    publisher: "Comdata, WEX, EFS, truck-stop chains, etc.",
    cadence: "Near real-time at participating sites",
    geography: "Network coverage (varies)",
    offers: "**Actual transaction or pump** prices where your agreement allows API or file feeds.",
    integration: "commercial_api",
    documentationUrl: "https://www.comdata.com/ (example — use your provider’s developer docs)",
  },
];

export type LegalRouteAlertSource = {
  id: string;
  name: string;
  publisher: string;
  offers: string;
  integration: "http_api" | "commercial_api" | "bulk_download";
  documentationUrl: string;
};

/** Legal paths for traffic, incidents, construction, and weather along a corridor. */
export const LEGAL_ROUTE_ALERT_SOURCES: LegalRouteAlertSource[] = [
  {
    id: "google-routes-traffic",
    name: "Google Routes / Maps Platform — live traffic & routes",
    publisher: "Google",
    offers: "Traffic-aware ETAs, polyline, incidents when enabled on your SKU — pair with your Maps contract.",
    integration: "commercial_api",
    documentationUrl: "https://developers.google.com/maps/documentation/routes",
  },
  {
    id: "here-traffic",
    name: "HERE Traffic & incidents",
    publisher: "HERE Technologies",
    offers: "Flow, incidents, road closures — common for fleet / logistics APIs.",
    integration: "commercial_api",
    documentationUrl: "https://developer.here.com/",
  },
  {
    id: "us-511",
    name: "U.S. state 511 / DOT open data",
    publisher: "State DOTs (varies)",
    offers: "Construction, closures, incidents per state; many publish RSS, JSON, or GTFS-RT-style feeds.",
    integration: "http_api",
    documentationUrl: "https://www.fhwa.dot.gov/trafficinfo/511.htm",
  },
  {
    id: "open511-bc",
    name: "Canadian Open511 / provincial APIs",
    publisher: "Provinces (e.g. BC Open511, Ontario 511)",
    offers: "Road events and conditions where published as open API data.",
    integration: "http_api",
    documentationUrl: "https://api.open511.gov.bc.ca/help",
  },
  {
    id: "nws-api",
    name: "National Weather Service API",
    publisher: "NOAA (U.S.)",
    offers: "Forecasts and alerts by lat/lon — free for U.S. coverage; sample along your route polyline.",
    integration: "http_api",
    documentationUrl: "https://www.weather.gov/documentation/services-web-api",
  },
  {
    id: "eccc-weather",
    name: "Environment and Climate Change Canada (MSC)",
    publisher: "Government of Canada",
    offers: "Meteorological forecasts and alerts; use official GeoMet / API offerings per MSC docs.",
    integration: "http_api",
    documentationUrl: "https://eccc-msc.github.io/open-data/msc-data/readme_en/",
  },
];
