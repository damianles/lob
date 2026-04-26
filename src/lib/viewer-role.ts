/**
 * Viewer-role types shared between client + server. We model the role from a UX angle —
 * a "kind" of viewer (Shipper, Carrier, Admin, Guest) plus the underlying business attrs
 * that drive theming and labelling (mill vs wholesaler, asset-based vs broker, owner-op).
 *
 * The DB still stores `User.role` (SHIPPER / DISPATCHER / DRIVER / ADMIN) and
 * `Company.supplierKind` / `Company.carrierType` / `Company.isOwnerOperator` separately.
 */

export type ViewerKind = "SHIPPER" | "CARRIER" | "ADMIN" | "GUEST";

export type SupplierKind = "MILL" | "WHOLESALER" | "OTHER";
export type CarrierBusinessType = "ASSET_BASED" | "BROKER";

export type ViewerRole = {
  kind: ViewerKind;
  /** Verbose label e.g. "Mill", "Wholesaler", "Carrier (Asset-based)", "Broker" */
  label: string;
  /** Short label e.g. "MILL", "BROKER", "ASSET", "ADMIN" — for the role pill */
  shortLabel: string;
  companyId: string | null;
  companyName: string | null;
  supplierKind: SupplierKind | null;
  carrierType: CarrierBusinessType | null;
  isOwnerOperator: boolean;
  verified: boolean;
  /** True when an admin is currently simulating a non-admin role for UX evaluation. */
  simulated: boolean;
  /** The admin's real role kind — only differs from `kind` when simulated. */
  realKind: ViewerKind;
};

export type ViewAsApiPayload = {
  role: "SHIPPER" | "DISPATCHER" | "DRIVER" | "ADMIN";
  supplierKind?: SupplierKind | null;
  carrierType?: CarrierBusinessType | null;
  isOwnerOperator?: boolean;
  verified?: boolean;
};

export type MeApiResponse = {
  signedIn: boolean;
  role: "SHIPPER" | "DISPATCHER" | "DRIVER" | "ADMIN" | null;
  realRole: "SHIPPER" | "DISPATCHER" | "DRIVER" | "ADMIN" | null;
  companyId: string | null;
  company: {
    id: string;
    legalName: string;
    supplierKind: SupplierKind | null;
    carrierType: CarrierBusinessType | null;
    isOwnerOperator: boolean;
    verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  } | null;
  simulated: boolean;
  viewAs: ViewAsApiPayload | null;
};

function kindFromRole(role: MeApiResponse["role"]): ViewerKind {
  if (role === "ADMIN") return "ADMIN";
  if (role === "SHIPPER") return "SHIPPER";
  if (role === "DISPATCHER" || role === "DRIVER") return "CARRIER";
  return "GUEST";
}

export function deriveViewerRole(me: MeApiResponse | null | undefined): ViewerRole {
  if (!me || !me.signedIn) {
    return {
      kind: "GUEST",
      label: "Guest",
      shortLabel: "GUEST",
      companyId: null,
      companyName: null,
      supplierKind: null,
      carrierType: null,
      isOwnerOperator: false,
      verified: false,
      simulated: false,
      realKind: "GUEST",
    };
  }

  const company = me.company;
  const verified = company?.verificationStatus === "APPROVED";
  const simulated = Boolean(me.simulated);
  const realKind = kindFromRole(me.realRole ?? me.role);

  if (me.role === "ADMIN") {
    return {
      kind: "ADMIN",
      label: "LOB Admin",
      shortLabel: "ADMIN",
      companyId: company?.id ?? null,
      companyName: company?.legalName ?? null,
      supplierKind: company?.supplierKind ?? null,
      carrierType: company?.carrierType ?? null,
      isOwnerOperator: company?.isOwnerOperator ?? false,
      verified,
      simulated,
      realKind,
    };
  }

  if (me.role === "SHIPPER") {
    // Supplier is a single persona in the chrome — both mills and wholesalers
    // experience the same product. The mill/wholesaler distinction is metadata
    // on the company file (used in admin views, analytics segmentation, etc.)
    // but is intentionally NOT surfaced as a separate persona to the user.
    const supplierKind = company?.supplierKind ?? null;
    return {
      kind: "SHIPPER",
      label: "Supplier",
      shortLabel: "SUPPLIER",
      companyId: company?.id ?? null,
      companyName: company?.legalName ?? null,
      supplierKind,
      carrierType: null,
      isOwnerOperator: false,
      verified,
      simulated,
      realKind,
    };
  }

  if (me.role === "DISPATCHER" || me.role === "DRIVER") {
    const ct = company?.carrierType ?? null;
    const oo = company?.isOwnerOperator ?? false;
    const label = oo
      ? "Carrier (Owner-operator)"
      : ct === "BROKER"
        ? "Broker"
        : ct === "ASSET_BASED"
          ? "Carrier (Asset-based)"
          : "Carrier";
    const shortLabel = oo ? "OWNER-OP" : ct === "BROKER" ? "BROKER" : ct === "ASSET_BASED" ? "ASSET" : "CARRIER";
    return {
      kind: "CARRIER",
      label,
      shortLabel,
      companyId: company?.id ?? null,
      companyName: company?.legalName ?? null,
      supplierKind: null,
      carrierType: ct,
      isOwnerOperator: oo,
      verified,
      simulated,
      realKind,
    };
  }

  return {
    kind: "GUEST",
    label: "Signed in",
    shortLabel: "USER",
    companyId: company?.id ?? null,
    companyName: company?.legalName ?? null,
    supplierKind: null,
    carrierType: null,
    isOwnerOperator: false,
    verified,
    simulated,
    realKind,
  };
}

/** Tailwind class helpers for role-tinted accents (lightweight; no inline styles). */
export function roleAccentClasses(kind: ViewerKind): {
  ribbonBg: string;
  ribbonBorder: string;
  ribbonText: string;
  pillBg: string;
  pillText: string;
  pillRing: string;
  cardBorder: string;
} {
  switch (kind) {
    case "CARRIER":
      return {
        ribbonBg: "bg-emerald-50",
        ribbonBorder: "border-emerald-200",
        ribbonText: "text-emerald-900",
        pillBg: "bg-emerald-600",
        pillText: "text-white",
        pillRing: "ring-emerald-500/30",
        cardBorder: "border-l-emerald-500",
      };
    case "ADMIN":
      return {
        ribbonBg: "bg-amber-50",
        ribbonBorder: "border-amber-200",
        ribbonText: "text-amber-900",
        pillBg: "bg-amber-600",
        pillText: "text-white",
        pillRing: "ring-amber-500/30",
        cardBorder: "border-l-amber-500",
      };
    case "SHIPPER":
      return {
        ribbonBg: "bg-[#eef1f7]",
        ribbonBorder: "border-[#dde2ec]",
        ribbonText: "text-lob-navy",
        pillBg: "bg-lob-navy",
        pillText: "text-white",
        pillRing: "ring-lob-navy/30",
        cardBorder: "border-l-lob-navy",
      };
    default:
      return {
        ribbonBg: "bg-stone-50",
        ribbonBorder: "border-stone-200",
        ribbonText: "text-stone-700",
        pillBg: "bg-stone-700",
        pillText: "text-white",
        pillRing: "ring-stone-500/30",
        cardBorder: "border-l-stone-300",
      };
  }
}
