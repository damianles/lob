# LOB: what each tool does (simple map)

## Error: Root Directory “web” does not exist

Vercel only sees the files in **your deployment**. If the repo (or `vercel deploy` upload) has **`package.json` at the top level** and **no** folder named `web`, then Root Directory must be **empty**.

- **Monorepo on GitHub:** repo root contains `web/package.json` → set Root Directory to **`web`**.  
- **App-only repo or CLI deploy from inside `web/`:** there is **no** `web` subfolder in the upload → Root Directory **empty**.

**Fix:** **Settings → General → Root Directory** → delete `web` → Save → Redeploy.

---

## If the live site still looks “old” (simple table, “API quick start”)

That layout is **not** in the current app in this repo (home uses a sidebar + `LoadBoardWorkspace`). So Vercel may be building **stale or different code**.

Check:

1. **Root directory** — Match the table above (not always `web`).
2. **Same Git repo** — Connected to the repo you push to.
3. **Branch** — Production branch matches your pushes (e.g. `main`).
4. **Build fingerprint** — After a good deploy, a grey line shows **Build `abcdef7`**. If missing, wrong project or old build.

---

| Tool | What it does for LOB |
|------|----------------------|
| **GitHub** (or GitLab, etc.) | Stores your code. When you push changes, Vercel can auto-redeploy. |
| **Vercel** | Hosts the live website (Next.js). **Redeploy = get the newest code + env vars live.** |
| **Supabase** | Your **PostgreSQL database** (where loads, users, companies live). Not the same as Vercel. |
| **Clerk** | **Sign-in / sign-up** for the site. Creates sessions; LOB also saves a matching row in the database. |

You do **not** need to log into Supabase or Clerk to “redeploy.” Redeploy is almost always **Vercel** (see below).

---

# Redeploy on Vercel (the usual path)

1. Open [vercel.com](https://vercel.com) and sign in.
2. Open your **LOB project** (e.g. `web-alpha-two-10` or whatever you named it).
3. Go to the **Deployments** tab.
4. Click **⋯** on the latest deployment → **Redeploy** (or push a new commit from GitHub to trigger a fresh build).

That’s it. Vercel will run `npm install` (which runs `prisma generate`) and `npm run build`, then serve the new version.

**Migrations are not run on Vercel** (pooler/direct URL issues caused too many failed builds). Apply schema changes **once from your laptop** with `npx prisma migrate deploy` using a **direct** Postgres URL — see **Database migrations (your Mac)** below.

**If your partner still sees the old site:** hard refresh (Ctrl+Shift+R / Cmd+Shift+R) or open an incognito window.

---

# Environment variables (Vercel → Project → Settings → Environment Variables)

Set these for **Production** (and **Preview** if you use preview URLs):

| Variable | Where to get it | Why |
|----------|-----------------|-----|
| `DATABASE_URL` | Supabase → **Connect** → **Session pooler** URI. Host must include **`pooler.supabase.com`** — **never** `db.<project>.supabase.co` on Vercel (causes “Can’t reach database server”). | Required for Prisma at runtime. |
| `MIGRATE_DATABASE_URL` | *(Optional)* Only if you later add migrate back into CI. Not required for current Vercel build. | Direct `db.<ref>.supabase.co:5432` — use locally for `migrate deploy` instead. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard | Sign-in UI. |
| `CLERK_SECRET_KEY` | Clerk dashboard | Server-side auth. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk → Webhooks (optional but good) | Auto-sync users; **sign-in still works without it** thanks to in-app sync. |

**Optional for demos / partner testing (turn off for real customers):**

| Variable | Effect |
|----------|--------|
| `LOB_AUTO_APPROVE_CARRIERS=true` | New trucking companies are approved immediately (no admin queue). |
| `NEXT_PUBLIC_LOB_DEMO_MODE=true` | Yellow **Demo / preview** banner at the top of every page. |

After changing env vars, **redeploy** so the new values apply.

---

# Database migrations (your Mac, against production or staging)

After pulling new code that includes `prisma/migrations/…` changes:

1. `cd` into your real `web` folder (example: `cd ~/LOB/web` — **not** `/path/to/...`).
2. In `.env.local`, set **`DATABASE_URL`** to the **direct** connection string from Supabase **Connect** (host `db.<project>.supabase.co`, port **5432**, not the `:6543` pooler). Same user/password as the dashboard.
3. Run:

```bash
npx prisma migrate deploy
```

Do this **after** deploys whenever new migration folders appear in the repo. Skip comment lines when pasting commands (`# …` is not a shell command).

# One-time database setup (seed data)

You still need **seed data** once (sample loads) if you want demo rows:

1. On your computer, clone the repo and `cd web`.
2. Copy `.env.example` → `.env.local` and set `DATABASE_URL` (pooler or direct is fine for seed).
3. Run:

```bash
npm install
npx prisma migrate deploy
npm run db:seed
```

That creates sample companies/loads so the board is not empty.

---

# Easiest way to “get it all functioning”

1. **Three accounts to remember:** Vercel (hosting), Supabase (database), Clerk (login).  
2. **Redeploy = Vercel** when you change code or env.  
3. **Database changes** = migrations run on Vercel build; **seed** = run once from your laptop against the same `DATABASE_URL`.  
4. **Two test users in Clerk** (mill + carrier) or one user + incognito for the second role — then walk: **Account setup** → post → book → driver link.

---

# Share with a partner

Send them:

- The **Vercel URL** (e.g. `https://your-project.vercel.app`).
- **Clerk** invite or “sign up” link if you restrict domains.
- If you enabled demo mode, say: *“Yellow banner means test environment.”*

They complete **Account setup** once, then use **Find loads** and click a **reference** link to open the **shipment progress** page.
