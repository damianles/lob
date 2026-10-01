export type AuthorityRegion = "US" | "CA" | "BOTH";

export function parseAuthorityRegion(raw: string | null | undefined): AuthorityRegion | null {
  const v = (raw || "").trim().toUpperCase();
  if (v === "US" || v === "CA" || v === "BOTH") return v;
  return null;
}

export function normalizeDotNumber(raw: string | null | undefined): string {
  return (raw || "").replace(/\D/g, "");
}

export function normalizeMcNumber(raw: string | null | undefined): string {
  const t = (raw || "").trim().toUpperCase().replace(/^MC[-\s]*/i, "");
  return t.replace(/[^A-Z0-9]/g, "");
}

export function normalizeCaBusinessNumber(raw: string | null | undefined): string {
  return (raw || "").replace(/\D/g, "");
}

export function requiresUsAuthority(region: AuthorityRegion): boolean {
  return region === "US" || region === "BOTH";
}

export function requiresCaAuthority(region: AuthorityRegion): boolean {
  return region === "CA" || region === "BOTH";
}

export function requiresW9(region: AuthorityRegion): boolean {
  return region === "US" || region === "BOTH";
}
