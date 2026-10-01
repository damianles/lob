/**
 * Builds Next.js app icons from the white knockout nested-L mark on LOB navy.
 *
 * Run: npm run brand:icons
 */

const sharp = require("sharp");
const path = require("node:path");
const fs = require("node:fs");

const root = path.join(__dirname, "..");
const knockout = path.join(root, "public", "brand", "lob-app-icon-knockout.png");
const appIcon = path.join(root, "public", "brand", "lob-app-icon.png");
const srcPng = fs.existsSync(knockout) ? knockout : appIcon;
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
    .flatten({ background: NAVY })
    .png()
    .toFile(outPath);
}

async function main() {
  if (!fs.existsSync(srcPng)) {
    throw new Error(`Missing brand mark at ${srcPng}`);
  }
  await writeSquareIcon(512, path.join(root, "src", "app", "icon.png"));
  await writeSquareIcon(180, path.join(root, "src", "app", "apple-icon.png"));
  console.log("Wrote src/app/icon.png (512) and src/app/apple-icon.png (180) from", path.basename(srcPng));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
