/**
 * Platform lane + usage snapshot for targeting mills/carriers to onboard.
 * Run: npm run report:marketplace-intel
 * Optional: DAYS=30 npm run report:marketplace-intel
 */
import { getMarketplaceIntelSnapshot } from "../src/lib/marketplace-intel";

const daysRaw = process.env.DAYS;
const periodDays = daysRaw && Number.isFinite(Number(daysRaw)) ? Number(daysRaw) : 90;
const intel = await getMarketplaceIntelSnapshot(periodDays);
console.log(JSON.stringify(intel, null, 2));
