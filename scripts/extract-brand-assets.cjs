/**
 * Splits `lob-brand-hero.png` (1024×540, logo left / marketing right) into:
 * - lob-brand-lockup.png — left panel (LOB + “Lumber One Board”) for one full-brand strip per page
 * - lob-mark-compact.png — top of left panel only (LOB + wood “O” + rule, no subtitle)
 *
 * Re-run after replacing lob-brand-hero.png if layout changes.
 */
const sharp = require("sharp");
const path = require("node:path");

const root = path.join(__dirname, "..");
const hero = path.join(root, "public", "brand", "lob-brand-hero.png");

async function main() {
  const meta = await sharp(hero).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 540;
  const leftW = Math.round(w / 2);
  /** ~top 46% of left column: acronym + separator, excludes “Lumber One Board” line */
  const compactH = Math.round(h * 0.46);

  await sharp(hero).extract({ left: 0, top: 0, width: leftW, height: h }).png().toFile(path.join(root, "public", "brand", "lob-brand-lockup.png"));

  await sharp(hero)
    .extract({ left: 0, top: 0, width: leftW, height: compactH })
    .png()
    .toFile(path.join(root, "public", "brand", "lob-mark-compact.png"));

  console.log(`Wrote lob-brand-lockup.png (${leftW}×${h}) and lob-mark-compact.png (${leftW}×${compactH})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
