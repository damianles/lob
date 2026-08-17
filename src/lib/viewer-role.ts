/**
 * Viewer-role types shared between client + server. We model the role from a UX angle —
 * a viewer kind (supplier, carrier, admin, guest, or setup-incomplete).
 *
 * The DB still stores `User.role` (SHIPPER / DISPATCHER / DRIVER / ADMIN) and
 * `Company.supplierKind` / `Company.carrierType` / `Company.isOwnerOperator` separately.
 * Mill vs wholesaler and asset vs broker vs owner-op are company metadata — not extra
 * product personas. Suppliers see carrier type via `CarrierTypeTag`.
 */

export type ViewerKind = "SHIPPER" | "CARRIER" | "ADMIN" | "GUEST" | "SETUP";

export type SupplierKind = "MILL" | "WHOLESALER" | "OTHER";
export type CarrierBusinessType = "ASSET_BASED" | "BROKER";

export type ViewerRole = {
  kind: ViewerKind;
  /** Verbose label e.g. "Supplier — post loads", "Carrier" */
  label: string;
  /** Compact badge: S / C / ADMIN — used in nav pill and View-as circles */
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

function kindFromRole(role: MeApiResponse["role"], companyId: string | null): ViewerKind {
  if (role === "ADMIN") return "ADMIN";
  if (role === "SHIPPER" && !companyId) return "SETUP";
  if (role === "SHIPPER") return "SHIPPER";
  if ((role === "DISPATCHER" || role === "DRIVER") && !companyId) return "SETUP";
  if (role === "DISPATCHER" || role === "DRIVER") return "CARRIER";
  return "GUEST";
}

function viewerRoleForCarrierOrg(
  company: MeApiResponse["company"],
  verified: boolean,
  simulated: boolean,
  realKind: ViewerKind,
): ViewerRole {
  const ct = company?.carrierType ?? null;
  const oo = company?.isOwnerOperator ?? false;
  return {
    kind: "CARRIER",
    label: "Carrier",
    shortLabel: "C",
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
  const companyId = me.companyId;
  const verified = company?.verificationStatus === "APPROVED";
  const simulated = Boolean(me.simulated);
  const realKind = kindFromRole(me.realRole ?? me.role, companyId);

  const needsCompanyLink =
    !simulated &&
    me.role !== "ADMIN" &&
    !companyId &&
    (me.role === "SHIPPER" || me.role === "DISPATCHER" || me.role === "DRIVER");

  if (needsCompanyLink) {
    return {
      kind: "SETUP",
      label: "Account setup — supplier or carrier",
      shortLabel: "SETUP",
      companyId: null,
      companyName: null,
      supplierKind: null,
      carrierType: null,
      isOwnerOperator: false,
      verified: false,
      simulated,
      realKind,
    };
  }

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

  /** Row says SHIPPER but company record is a trucking org — show carrier chrome (stale role or bad merge). */
  const companyLooksLikeCarrierOnly =
    Boolean(company?.carrierType) && company?.supplierKind == null;

  if (me.role === "SHIPPER" && company && companyLooksLikeCarrierOnly) {
    return viewerRoleForCarrierOrg(company, verified, simulated, realKind);
  }

  if (me.role === "SHIPPER") {
    // Supplier is a single persona in the chrome — both mills and wholesalers
    // experience the same product. The mill/wholesaler distinction is metadata
    // on the company file (used in admin views, analytics segmentation, etc.)
    // but is intentionally NOT surfaced as a separate persona to the user.
    const supplierKind = company?.supplierKind ?? null;
    return {
      kind: "SHIPPER",
      label: "Supplier — post loads",
      shortLabel: "S",
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
    return viewerRoleForCarrierOrg(company, verified, simulated, realKind);
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

/**
 * Visual persona for chrome tinting. Carrier is one tone — asset / broker /
 * owner-op is company metadata shown to suppliers, not a separate shell.
 */
export type PersonaTone =
  | "supplier"
  | "carrier"
  | "admin"
  | "setup"
  | "guest";

export function personaToneFromViewer(
  viewer: Pick<ViewerRole, "kind" | "carrierType" | "isOwnerOperator">,
): PersonaTone {
  if (viewer.kind === "SHIPPER") return "supplier";
  if (viewer.kind === "ADMIN") return "admin";
  if (viewer.kind === "SETUP") return "setup";
  if (viewer.kind === "GUEST") return "guest";
  if (viewer.kind === "CARRIER") return "carrier";
  return "guest";
}

export type RoleAccentClasses = {
  ribbonBg: string;
  ribbonBorder: string;
  ribbonText: string;
  pillBg: string;
  pillText: string;
  pillRing: string;
  cardBorder: string;
  /** Soft full-page wash (main shells that opt in). */
  pageBg: string;
};

/** Tailwind class helpers for persona-tinted accents (lightweight; no inline styles). */
export function roleAccentClasses(
  viewerOrKind: ViewerKind | Pick<ViewerRole, "kind" | "carrierType" | "isOwnerOperator">,
): RoleAccentClasses {
  const tone =
    typeof viewerOrKind === "string"
      ? personaToneFromViewer({
          kind: viewerOrKind,
          carrierType: null,
          isOwnerOperator: false,
        })
      : personaToneFromViewer(viewerOrKind);

  switch (tone) {
    case "supplier":
      /* Wood / honey-oak wash — matches LOB gold brand. */
      return {
        ribbonBg: "bg-[#faf4eb]",
        ribbonBorder: "border-[#e8d4b0]",
        ribbonText: "text-[#5c3d12]",
        pillBg: "bg-lob-gold",
        pillText: "text-white",
        pillRing: "ring-lob-gold/35",
        cardBorder: "border-l-lob-gold",
        pageBg: "bg-[#faf6f0]",
      };
    case "carrier":
      /* Light blue — one carrier / service-provider identity. */
      return {
        ribbonBg: "bg-sky-50",
        ribbonBorder: "border-sky-200",
        ribbonText: "text-sky-950",
        pillBg: "bg-sky-600",
        pillText: "text-white",
        pillRing: "ring-sky-500/30",
        cardBorder: "border-l-sky-500",
        pageBg: "bg-sky-50/80",
      };
    case "admin":
      return {
        ribbonBg: "bg-amber-50",
        ribbonBorder: "border-amber-200",
        ribbonText: "text-amber-900",
        pillBg: "bg-amber-600",
        pillText: "text-white",
        pillRing: "ring-amber-500/30",
        cardBorder: "border-l-amber-500",
        pageBg: "bg-amber-50/40",
      };
    case "setup":
      return {
        ribbonBg: "bg-amber-50",
        ribbonBorder: "border-amber-200",
        ribbonText: "text-amber-950",
        pillBg: "bg-amber-700",
        pillText: "text-white",
        pillRing: "ring-amber-500/30",
        cardBorder: "border-l-amber-500",
        pageBg: "bg-amber-50/50",
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
        pageBg: "bg-lob-paper",
      };
  }
}
