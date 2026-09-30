/**
 * Preview/demo shortcuts that must never silently apply on Vercel Production.
 */
export function isMarketplaceAutoApproveAllowed(): boolean {
  if (process.env.VERCEL_ENV === "production" && process.env.LOB_ALLOW_PREVIEW_ADMIN_TOOLS !== "true") {
    return false;
  }
  return true;
}

export function autoApproveCarriersEnabled(): boolean {
  return isMarketplaceAutoApproveAllowed() && process.env.LOB_AUTO_APPROVE_CARRIERS === "true";
}

export function autoApproveSuppliersEnabled(): boolean {
  return isMarketplaceAutoApproveAllowed() && process.env.LOB_AUTO_APPROVE_SUPPLIERS === "true";
}

/** Unsigned company create is for local/dev only. */
export function allowUnsignedCompanyCreate(): boolean {
  if (process.env.LOB_ALLOW_UNSIGNED_COMPANY_CREATE === "true") {
    return process.env.VERCEL_ENV !== "production" || process.env.LOB_ALLOW_PREVIEW_ADMIN_TOOLS === "true";
  }
  return process.env.NODE_ENV === "development";
}

export function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}
