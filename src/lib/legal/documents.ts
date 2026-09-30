/**
 * Versioned platform legal documents for clickwrap acceptance.
 * Bump `version` (and `effectiveDate`) whenever counsel revises wording so
 * onboarding requires re-acceptance of the current set.
 *
 * PROCESS (not an engineering invent): keep `isDraft: true` until counsel
 * delivers finals. Then set `isDraft: false`, bump `version`, and carriers
 * missing the new versions re-accept via `missingLegalAcceptancesForUser`
 * in `src/lib/legal/reaccept.ts`. Do not soft-launch paid customers on
 * draft-only clickwrap without that bump.
 */

export type LegalDocumentKey =
  | "PLATFORM_TERMS"
  | "PRIVACY_POLICY"
  | "SUPPLIER_AGREEMENT"
  | "CARRIER_AGREEMENT";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  key: LegalDocumentKey;
  /** Stable slug for /legal/[slug] */
  slug: string;
  title: string;
  /** Semver or dated version string stored on acceptance records */
  version: string;
  effectiveDate: string;
  summary: string;
  /** Reserved for future draft previews; production docs ship with false */
  isDraft: boolean;
  sections: LegalSection[];
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  PLATFORM_TERMS: {
    key: "PLATFORM_TERMS",
    slug: "terms",
    title: "Lumber One Board — Platform Terms of Use",
    version: "2026.09.30-draft",
    effectiveDate: "2026-09-30",
    isDraft: true,
    summary:
      "Rules for using the LOB marketplace: accounts, postings, bookings, privacy until engagement, and platform limits.",
    sections: [
      {
        heading: "1. Parties and nature of the service",
        paragraphs: [
          "These Platform Terms of Use (“Terms”) govern access to and use of the Lumber One Board application and related services (the “Platform”) operated by Lumber One Board (“LOB”, “we”, “us”).",
          "The Platform is a digital marketplace that enables suppliers of forest products freight (“Suppliers”) to post loads and carriers / brokers (“Carriers”) to offer capacity and book loads. Unless expressly agreed in writing, LOB is not the shipper, carrier, broker of record, or freight forwarder for any shipment arranged through the Platform.",
          "By creating an account, completing onboarding, or using the Platform, you agree to these Terms on behalf of yourself and the company you represent.",
        ],
      },
      {
        heading: "2. Eligibility and accounts",
        paragraphs: [
          "You must be at least 18 years old and authorized to bind the company named in your registration.",
          "You are responsible for safeguarding login credentials and for all activity under your account. Notify LOB promptly of unauthorized access.",
          "LOB may approve, suspend, or reject company registrations (including verification of Supplier or Carrier status) at its discretion to protect marketplace integrity.",
        ],
      },
      {
        heading: "3. Marketplace conduct",
        paragraphs: [
          "You agree to provide accurate company, contact, equipment, rate, and shipment information.",
          "You will not scrape, harvest, or use the Platform to build competing directories of mills, carriers, rates, or lanes outside ordinary use of the product.",
          "You will not circumvent privacy, exclusion, tiering, or identity-masking features designed to protect counterparties before a booking or accepted capacity match.",
          "You will not post fraudulent loads, capacity, bids, or documents, or use the Platform for unlawful freight.",
        ],
      },
      {
        heading: "4. Postings, bids, capacity, and bookings",
        paragraphs: [
          "Load postings, open bids, firm rates, capacity offers, and capacity requests create marketplace invitations subject to the Supplier Agreement and Carrier Agreement, as applicable.",
          "A booking or accepted capacity match on the Platform is intended to form a commercial engagement between Supplier and Carrier at the agreed rate and terms shown in-app (including rate confirmation materials). LOB may facilitate documentation but is not a party to the haul contract unless stated otherwise in a signed addendum.",
          "LOB may modify Marketplace features, rate-mode rules, grace periods, and visibility logic; material changes to these Terms will be versioned and may require re-acceptance.",
        ],
      },
      {
        heading: "5. Fees",
        paragraphs: [
          "Platform subscription, transaction, or other fees (if any) will be disclosed before they apply. Unless stated, LOB does not collect freight charges between Supplier and Carrier.",
        ],
      },
      {
        heading: "6. Disclaimers",
        paragraphs: [
          "THE PLATFORM IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOB DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.",
          "LOB does not guarantee continuous uptime, that any load or capacity will match, or the performance, insurance, licensing, or solvency of any counterparty.",
        ],
      },
      {
        heading: "7. Limitation of liability",
        paragraphs: [
          "TO THE MAXIMUM EXTENT PERMITTED BY LAW, LOB’S TOTAL LIABILITY ARISING OUT OF OR RELATED TO THE PLATFORM OR THESE TERMS WILL NOT EXCEED THE GREATER OF (A) FEES YOU PAID TO LOB FOR THE PLATFORM IN THE THREE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED CANADIAN DOLLARS (CAD $100).",
          "LOB WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR LOST-PROFIT DAMAGES, OR FOR CARGO LOSS, DELAY, OR DETENTION, EVEN IF ADVISED OF THE POSSIBILITY.",
        ],
      },
      {
        heading: "8. Indemnity",
        paragraphs: [
          "You will defend and indemnify LOB against claims arising from your misuse of the Platform, your freight arrangements, your content, or your breach of these Terms or applicable law.",
        ],
      },
      {
        heading: "9. Governing law",
        paragraphs: [
          "These Terms are governed by the laws of the Province of British Columbia and the federal laws of Canada applicable therein, without regard to conflict-of-law rules. Courts in British Columbia will have exclusive jurisdiction, subject to any mandatory consumer protections that cannot be waived.",
        ],
      },
      {
        heading: "10. Changes and contact",
        paragraphs: [
          "We may update these Terms by publishing a new version on the Platform. Continued use after the effective date, or clickwrap re-acceptance when required, constitutes agreement to the new version.",
          "Questions: use support channels published in the LOB application.",
        ],
      },
    ],
  },

  PRIVACY_POLICY: {
    key: "PRIVACY_POLICY",
    slug: "privacy",
    title: "Lumber One Board — Privacy Policy",
    version: "2026.09.30-draft",
    effectiveDate: "2026-09-30",
    isDraft: true,
    summary: "How LOB collects, uses, and shares personal and company information on the Platform.",
    sections: [
      {
        heading: "1. Scope",
        paragraphs: [
          "This Privacy Policy describes how Lumber One Board (“LOB”) handles personal information and related business data when you use the Platform.",
          "LOB handles personal information in line with PIPEDA and applicable provincial privacy laws, and with applicable US state requirements for US users where those laws apply.",
        ],
      },
      {
        heading: "2. Information we collect",
        paragraphs: [
          "Account data: name, email, authentication identifiers (e.g. via Clerk), role, and company affiliation.",
          "Company data: legal name, acronym, business phone, billing address (optional), DOT/MC (carriers), supplier kind, verification status, fleet profile, and document links you provide.",
          "Marketplace data: loads, rates, bids, capacity, bookings, dispatch links, POD/documents metadata, exclusions, tiers, and related timestamps.",
          "Technical data: IP address, user agent, device/browser signals, and logs needed for security and abuse prevention.",
        ],
      },
      {
        heading: "3. How we use information",
        paragraphs: [
          "To operate the marketplace (posting, matching, booking, dispatch, analytics you enable).",
          "To verify companies, enforce exclusions/tiers, and protect identity until booking or accepted capacity engagement.",
          "To provide support, prevent fraud, improve the product, and meet legal obligations.",
          "To record legal acceptances (document key, version, time, and related audit fields).",
        ],
      },
      {
        heading: "4. Sharing",
        paragraphs: [
          "Counterparties see information required for the transaction stage (e.g. identity may remain masked until book/accept; shipment details unlock as designed).",
          "Service providers (hosting, auth, database, email when enabled) process data under contract.",
          "We may disclose information if required by law or to protect rights, safety, and the integrity of the Platform.",
          "We do not sell personal information.",
        ],
      },
      {
        heading: "5. Retention and security",
        paragraphs: [
          "We retain account and transaction records for as long as needed to operate the Platform, resolve disputes, and meet legal/accounting requirements.",
          "We use reasonable administrative and technical safeguards; no method of transmission or storage is fully secure.",
        ],
      },
      {
        heading: "6. Your choices",
        paragraphs: [
          "You may update profile/company information in-app where available, or contact LOB to request access, correction, or deletion subject to legal retention needs.",
          "Marketing communications, if any, will include unsubscribe options.",
        ],
      },
      {
        heading: "7. Contact",
        paragraphs: [
          "Privacy requests: use support channels published in the LOB application.",
        ],
      },
    ],
  },

  SUPPLIER_AGREEMENT: {
    key: "SUPPLIER_AGREEMENT",
    slug: "supplier-agreement",
    title: "Lumber One Board — Supplier Agreement",
    version: "2026.09.30-draft",
    effectiveDate: "2026-09-30",
    isDraft: true,
    summary:
      "Supplier-specific terms for posting loads, rates, capacity requests, exclusions, and dealings with Carriers on LOB.",
    sections: [
      {
        heading: "1. Role",
        paragraphs: [
          "This Supplier Agreement supplements the Platform Terms and applies when you register as a Supplier (mill, wholesaler, reload, or other lumber shipper) on LOB.",
          "You represent that you are authorized to tender the freight you post and that shipment details (origin/destination, dates, equipment, weight, product, and rates) are accurate to the best of your knowledge.",
        ],
      },
      {
        heading: "2. Load postings and rate modes",
        paragraphs: [
          "Firm Rate and Open Bid modes operate as configured in the Platform (including bid windows, cycles, board grace, and repost rules).",
          "When a Carrier books a Firm Rate load or you accept a bid/counter, you agree to tender that shipment to that Carrier at the agreed rate shown in the Platform, subject to customary documentation (e.g. rate confirmation / BOL workflows).",
          "You are responsible for cancelling or updating loads promptly when freight is no longer available.",
        ],
      },
      {
        heading: "3. Capacity requests",
        paragraphs: [
          "When you request posted Carrier capacity (including by attaching or spawning a load), you authorize LOB to notify that Carrier and, upon Carrier acceptance, to book the linked load at the applicable rate rules in the Platform.",
          "Carrier identity may remain hidden until acceptance; you agree not to attempt to deanonymize Carriers outside Platform features.",
        ],
      },
      {
        heading: "4. Preferences, tiers, and exclusions",
        paragraphs: [
          "Company-level exclusions and tier visibility settings you configure are enforced as designed. You are responsible for maintaining accurate preference lists.",
        ],
      },
      {
        heading: "5. Payment and cargo responsibility",
        paragraphs: [
          "Unless LOB offers a separate payment product you enroll in, freight payment remains between you and the Carrier (or your factoring/payment partners).",
          "Risk of loss, cargo claims, detention, and accessorials are governed by your haul documents and applicable law — not by LOB marketplace matching alone.",
        ],
      },
      {
        heading: "6. Representations",
        paragraphs: [
          "You will not post loads you cannot tender, misstate rates or appointments, or use the Platform to solicit Carriers for off-platform deals that evade LOB fees (if fees apply) or privacy controls.",
        ],
      },
    ],
  },

  CARRIER_AGREEMENT: {
    key: "CARRIER_AGREEMENT",
    slug: "carrier-agreement",
    title: "Lumber One Board — Carrier Agreement",
    version: "2026.09.30-draft",
    effectiveDate: "2026-09-30",
    isDraft: true,
    summary:
      "Carrier-specific terms for booking loads, posting capacity, insurance/authority, and performance on LOB.",
    sections: [
      {
        heading: "1. Role",
        paragraphs: [
          "This Carrier Agreement supplements the Platform Terms and applies when you register as a Carrier (asset-based, broker, or owner-operator) on LOB.",
          "You represent that you hold all licenses, authority, and insurance required to lawfully perform or arrange the transportation you accept on the Platform.",
        ],
      },
      {
        heading: "2. Bookings and capacity",
        paragraphs: [
          "Booking a load or accepting a Supplier capacity request constitutes your agreement to haul (or lawfully arrange haulage of) that shipment at the agreed rate and according to the load details then shown, subject to rate confirmation / dispatch workflows in the Platform.",
          "Capacity offers must reflect real availability windows, equipment, and asking rates. Matched capacity should be cancelled or updated if no longer available.",
          "If you identify as a broker, you remain responsible for the performance of the underlying asset carrier you tender to, and for accurate disclosure where the Platform requires it.",
        ],
      },
      {
        heading: "3. Identity and anti-leakage",
        paragraphs: [
          "Supplier identity on open loads and Carrier identity on open capacity may be masked until booking or accepted capacity engagement. You agree not to misuse the Platform to harvest counterparty lists.",
        ],
      },
      {
        heading: "4. Compliance documents",
        paragraphs: [
          "You will maintain current authority and insurance information and upload documents when requested. LOB may suspend access if verification fails or documents expire.",
        ],
      },
      {
        heading: "5. Performance and incidents",
        paragraphs: [
          "You will use dispatch, pickup confirmation, and POD features as provided. Repeated no-shows, dropped loads, or policy violations may affect reliability scoring and Platform access.",
          "Cargo claims and payment disputes are primarily between you and the Supplier (and insurers), except where a separate LOB program applies.",
        ],
      },
      {
        heading: "6. Representations",
        paragraphs: [
          "You will not book loads you cannot cover, double-broker in violation of law or Platform rules, or misrepresent equipment, authority, or owner-operator status.",
        ],
      },
    ],
  },
};

export const LEGAL_BY_SLUG: Record<string, LegalDocument> = Object.fromEntries(
  Object.values(LEGAL_DOCUMENTS).map((d) => [d.slug, d]),
);

/** Documents every user must accept (either role). */
export const COMMON_LEGAL_KEYS: LegalDocumentKey[] = ["PLATFORM_TERMS", "PRIVACY_POLICY"];

export function requiredLegalKeysForRole(role: "SHIPPER" | "DISPATCHER"): LegalDocumentKey[] {
  if (role === "SHIPPER") return [...COMMON_LEGAL_KEYS, "SUPPLIER_AGREEMENT"];
  return [...COMMON_LEGAL_KEYS, "CARRIER_AGREEMENT"];
}

export type LegalAcceptancePayload = {
  documentKey: LegalDocumentKey;
  documentVersion: string;
};

/**
 * Ensures the client accepted exactly the current versions of every required doc.
 */
export function validateLegalAcceptances(
  role: "SHIPPER" | "DISPATCHER",
  acceptances: LegalAcceptancePayload[] | undefined,
): { ok: true; accepted: LegalAcceptancePayload[] } | { ok: false; error: string } {
  const required = requiredLegalKeysForRole(role);
  if (!acceptances || acceptances.length === 0) {
    return { ok: false, error: "You must accept the required legal agreements to continue." };
  }
  const byKey = new Map(acceptances.map((a) => [a.documentKey, a]));
  for (const key of required) {
    const got = byKey.get(key);
    const current = LEGAL_DOCUMENTS[key];
    if (!got) {
      return { ok: false, error: `Please accept the ${current.title}.` };
    }
    if (got.documentVersion !== current.version) {
      return {
        ok: false,
        error: `A newer version of ${current.title} is required. Refresh and accept again.`,
      };
    }
  }
  return {
    ok: true,
    accepted: required.map((key) => ({
      documentKey: key,
      documentVersion: LEGAL_DOCUMENTS[key].version,
    })),
  };
}
