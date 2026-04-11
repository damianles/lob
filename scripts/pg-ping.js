/**
 * Tests a real Postgres login with DATABASE_URL (same as Prisma uses).
 * Run: cd web && npm run db:ping
 */
const path = require("path");
const { config } = require("dotenv");
const { Client } = require("pg");

const root = path.join(__dirname, "..");
config({ path: path.join(root, ".env") });
config({ path: path.join(root, ".env.local"), override: true });

const url = process.env.DATABASE_URL;
if (!url?.trim()) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const client = new Client({ connectionString: url, connectionTimeoutMillis: 15_000 });
client
  .connect()
  .then(() => client.query("select 1 as ok"))
  .then((res) => {
    console.log("Postgres OK:", res.rows[0]);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Postgres connection failed:", err.message);
    process.exit(1);
  })
  .finally(() => client.end().catch(() => {}));
