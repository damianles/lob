/**
 * Builds Next.js app icons from public/brand/lob-app-icon.png (preferred), else lob-mark-compact.png.
 * Scales uniformly (fit: contain) on LOB navy — does not redraw the mark.
 *
 * Run: npm run brand:icons
 */

const sharp = require("sharp");
const path = require("node:path");
const fs = require("node:fs");

const root = path.join(__dirname, "..");
const appIcon = path.join(root, "public", "brand", "lob-app-icon.png");
const compact = path.join(root, "public", "brand", "lob-mark-compact.png");
const fallback = path.join(root, "public", "brand", "lob-concept-primary.png");
const srcPng = fs.existsSync(appIcon) ? appIcon : fs.existsSync(compact) ? compact : fallback;
/** Matches --lob-navy in globals.css (#001233) */
const NAVY = { r: 0, g: 18, b: 51, alpha: 1 };

async function writeSquareIcon(size, outPath) {
  await sharp(srcPng)
    .resize({
      width: size,
      height: size,
      fit: "contain",
      position: "centre",
      background: NAVY,
    })
    .png()
    .toFile(outPath);
}

async function main() {
  await writeSquareIcon(512, path.join(root, "src", "app", "icon.png"));
  await writeSquareIcon(180, path.join(root, "src", "app", "apple-icon.png"));
  console.log("Wrote src/app/icon.png (512) and src/app/apple-icon.png (180) from", path.basename(srcPng));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
