/**
 * Brand assets (the approved set).
 *
 * Source of truth for all logo/wordmark usage in the app. To update branding,
 * replace the PNGs in `public/brand/` and update the dimensions below.
 *
 * Restore approved hybrid-05 lockup (frozen — no geometry experiments):
 *   python scripts/restore-approved-hybrid05.py
 *
 * Currently shipped (true PNG only — do not check in JPEG bytes with a .png name):
 * - lob-app-icon.png            — square nested-L mark, navy on white (1024×1024) — light UI / favicon source
 * - lob-app-icon-knockout.png   — white nested-L mark, transparent (1024×1024) — favicon tile
 * - lob-mark.svg                — vector source for the nested-L mark
 * - lob-lockup-knockout.png     — full logo white+gold on transparent (print / share)
 * - lob-brand-lockup.png        — full logo mark | gold | LOB / LUMBER ONE BOARD (light)
 * - lob-dark-lockup.png         — same full logo on navy
 * - lob-mark-compact.png        — square mark (same as app icon)
 * - lob-brand-hero.png          — marketing hero card
 * - lob-concept-primary.png     — alt wide concept
 * - lob-brand-poster-vertical.png — vertical poster
 *
 * Favicon = mark only (`src/app/icon.png`).
 * Masthead = hybrid-05 full lockup knockout (mark | gold | LOB / LUMBER ONE BOARD).
 *
 * Design review copies live under `public/brand/catalog/` and `public/brand/final/`
 * (PNGs in `catalog/` are gitignored; promote chosen finals into `public/brand/`).
 */

/** Square nested-L mark (navy on white) — light UI, onboarding, LobAppIconMark default. */
export const LOB_APP_ICON_SRC = "/brand/lob-app-icon.png";
export const LOB_APP_ICON_SIZE = 1024;

/** White nested-L mark on transparent — used to build favicon on navy. */
export const LOB_APP_ICON_KNOCKOUT_SRC = "/brand/lob-app-icon-knockout.png";
export const LOB_APP_ICON_KNOCKOUT_WIDTH = 1024;
export const LOB_APP_ICON_KNOCKOUT_HEIGHT = 1024;

/** Full logo (mark | gold rule | LOB / LUMBER ONE BOARD), white+gold on transparent. */
export const LOB_LOCKUP_KNOCKOUT_SRC = "/brand/lob-lockup-knockout.png";
export const LOB_LOCKUP_KNOCKOUT_WIDTH = 1696;
export const LOB_LOCKUP_KNOCKOUT_HEIGHT = 647;

/** Wide concept art — alternate marketing/share card (currently same as hero). */
export const LOB_CONCEPT_PRIMARY_SRC = "/brand/lob-concept-primary.png";
export const LOB_CONCEPT_PRIMARY_WIDTH = 1024;
export const LOB_CONCEPT_PRIMARY_HEIGHT = 540;

/** Marketing hero: logo panel + tagline + URL (entry / OG share). */
export const LOB_BRAND_HERO_SRC = "/brand/lob-brand-hero.png";
export const LOB_BRAND_HERO_WIDTH = 1024;
export const LOB_BRAND_HERO_HEIGHT = 540;

/** Full horizontal lockup (mark | gold rule | LOB / Lumber One Board) — light / print docs. */
export const LOB_BRAND_LOCKUP_SRC = "/brand/lob-brand-lockup.png";
export const LOB_BRAND_LOCKUP_WIDTH = 1280;
export const LOB_BRAND_LOCKUP_HEIGHT = 720;

/** Dark navy lockup (full logo) — print / dark chrome. */
export const LOB_DARK_LOCKUP_SRC = "/brand/lob-dark-lockup.png";
export const LOB_DARK_LOCKUP_WIDTH = 1696;
export const LOB_DARK_LOCKUP_HEIGHT = 647;

/** Dark navy wordmark only (“Lumber One Board”) — global top masthead. */
export const LOB_DARK_WORDMARK_SRC = "/brand/lob-dark-wordmark.png";
export const LOB_DARK_WORDMARK_WIDTH = 847;
export const LOB_DARK_WORDMARK_HEIGHT = 110;

/** Compact square mark (same nested-L as app icon). */
export const LOB_MARK_COMPACT_SRC = "/brand/lob-mark-compact.png";
export const LOB_MARK_COMPACT_WIDTH = 1024;
export const LOB_MARK_COMPACT_HEIGHT = 1024;

/** Vertical poster: stacked lockup + "Connecting Shippers & Carriers" tagline. Sign-in / mobile splash. */
export const LOB_BRAND_POSTER_VERTICAL_SRC = "/brand/lob-brand-poster-vertical.png";
export const LOB_BRAND_POSTER_VERTICAL_WIDTH = 571;
export const LOB_BRAND_POSTER_VERTICAL_HEIGHT = 1024;
