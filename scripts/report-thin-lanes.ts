/**
 * Lists benchmark lanes with sampleCount > 0 and < 5 (need manual averages until data grows).
 * Run: npx tsx scripts/report-thin-lanes.ts
 */
import { listThinLanes } from "../src/lib/market-rate-lane";

const rows = listThinLanes();
console.log(JSON.stringify({ thinLaneCount: rows.length, lanes: rows }, null, 2));
