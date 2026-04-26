/**
 * Brand assets (the approved set).
 *
 * Source of truth for all logo/wordmark usage in the app. To update branding,
 * replace the PNGs in `web/public/brand/` and update the dimensions below.
 *
 * Currently shipped:
 * - lob-app-icon.png            — square dark-navy mark (1024×1024) — favicons, sidebar, social avatar
 * - lob-brand-lockup.png        — horizontal "LOB | Lumber One Board" (1024×799 canvas, content centered)
 * - lob-mark-compact.png        — same horizontal lockup at compact size (1024×799)
 * - lob-brand-hero.png          — split panel: logo + "The #1 Lumber Load Board" + URL (1024×540)
 * - lob-concept-primary.png     — alt wide concept (currently mirrors hero — 1024×540)
 * - lob-brand-poster-vertical.png — vertical poster: stacked LOB lockup + "Connecting Shippers & Carriers" (571×1024)
 *
 * Design review copies live under `public/brand/catalog/` and `public/brand/final/`
 * (PNGs in `catalog/` are gitignored; promote chosen finals into `public/brand/`).
 */

/** Square app icon (dark navy + wood-O) — favicon source, sidebar mark, social avatar. */
export const LOB_APP_ICON_SRC = "/brand/lob-app-icon.png";
export const LOB_APP_ICON_SIZE = 1024;

/** Wide concept art — alternate marketing/share card (currently same as hero). */
export const LOB_CONCEPT_PRIMARY_SRC = "/brand/lob-concept-primary.png";
export const LOB_CONCEPT_PRIMARY_WIDTH = 1024;
export const LOB_CONCEPT_PRIMARY_HEIGHT = 540;

/** Marketing hero: logo panel + tagline + URL (entry / OG share). */
export const LOB_BRAND_HERO_SRC = "/brand/lob-brand-hero.png";
export const LOB_BRAND_HERO_WIDTH = 1024;
export const LOB_BRAND_HERO_HEIGHT = 540;

/** Full horizontal lockup (LOB | Lumber One Board) — masthead, page headers, email signature. */
export const LOB_BRAND_LOCKUP_SRC = "/brand/lob-brand-lockup.png";
export const LOB_BRAND_LOCKUP_WIDTH = 1024;
export const LOB_BRAND_LOCKUP_HEIGHT = 799;

/** Compact horizontal mark (currently shares the lockup PNG). */
export const LOB_MARK_COMPACT_SRC = "/brand/lob-mark-compact.png";
export const LOB_MARK_COMPACT_WIDTH = 1024;
export const LOB_MARK_COMPACT_HEIGHT = 799;

/** Vertical poster: stacked lockup + "Connecting Shippers & Carriers" tagline. Sign-in / mobile splash. */
export const LOB_BRAND_POSTER_VERTICAL_SRC = "/brand/lob-brand-poster-vertical.png";
export const LOB_BRAND_POSTER_VERTICAL_WIDTH = 571;
export const LOB_BRAND_POSTER_VERTICAL_HEIGHT = 1024;
