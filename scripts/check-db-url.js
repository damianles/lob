/**
 * Verifies DATABASE_URL is set and parseable (no secrets printed).
 * Run from repo root: cd web && npm run db:check-env
 */
const fs = require("fs");
const path = require("path");
const { config } = require("dotenv");

const root = path.join(__dirname, "..");
config({ path: path.join(root, ".env") });
config({ path: path.join(root, ".env.local"), override: true });

/** Dotenv treats # as start of comment unless the value is quoted — truncates URLs. */
function warnIfEnvLineBreaksHash() {
  let lastLine = null;
  let lastFile = null;
  for (const name of [".env", ".env.local"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
    for (const line of lines) {
      if (/^\s*DATABASE_URL\s*=/.test(line)) {
        lastLine = line;
        lastFile = name;
      }
    }
  }
  if (!lastLine) return;
  const eq = lastLine.indexOf("=");
  const after = lastLine.slice(eq + 1).trimStart();
  const quoted =
    (after.startsWith('"') && after.endsWith('"')) ||
    (after.startsWith("'") && after.endsWith("'"));
  if (!quoted && after.includes("#")) {
    console.warn(
      `\n⚠️  ${lastFile}: DATABASE_URL is not wrapped in quotes but contains "#".`,
    );
    console.warn(
      "   In .env files, # starts a comment unless the value is in double quotes.",
    );
    console.warn(
      '   Fix: DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@host:5432/postgres?sslmode=require"\n',
    );
  }
}
warnIfEnvLineBreaksHash();

const raw = process.env.DATABASE_URL;
if (!raw || !String(raw).trim()) {
  console.error("DATABASE_URL is missing or empty in web/.env");
  process.exit(1);
}

let url;
try {
  url = new URL(raw.replace(/^postgresql:/i, "http:"));
} catch {
  console.error("DATABASE_URL is not a valid URL");
  process.exit(1);
}

const pass = url.password || "";
console.log("DATABASE_URL is loaded.");
console.log("  Host:", url.hostname);
console.log("  Port:", url.port || "(default)");
console.log("  User:", url.username || "(none)");
console.log("  Password length:", pass.length, pass.length ? "" : "(empty — will fail auth)");
console.log("  Path:", url.pathname || "/");
if (!url.searchParams.get("sslmode") && !raw.includes("sslmode=")) {
  console.log("  Hint: add ?sslmode=require (or &sslmode=require) for Supabase.");
}
console.log("\nNext: npm run db:deploy");
