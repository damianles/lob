# Get the new LOB live (read this first)

## What was wrong

1. **Almost none of the app was committed to Git.** Vercel only deploys what is in GitHub. Your site was still the old “Create Next App” page from the first commit.
2. **This folder (`web/`) is the whole Git repo.** There is no `web` subfolder inside the repo. On Vercel, **Root Directory must be empty** (not `web`).

A fresh commit with the full app has been created **on your machine**. You only need to **push** it to GitHub and point Vercel at that repo.

---

## Step 1 — Push this code to GitHub

Open **Terminal** and run (paths are for your Mac):

```bash
cd /Users/damianles/LOB/web
git status    # should say "nothing to commit" if you're up to date
```

### If you do **not** have a GitHub repo yet

1. On GitHub: **New repository** → name it e.g. `lob` → create **without** README (empty repo).
2. Then run (replace `YOUR_USER` and `lob` with your names):

```bash
cd /Users/damianles/LOB/web
git remote add origin https://github.com/YOUR_USER/lob.git
git push -u origin main
```

### If you **already** have a repo on GitHub for this project

```bash
cd /Users/damianles/LOB/web
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git   # skip if origin already exists
git push -u origin main
```

If `git remote -v` already shows a URL, you only need:

```bash
git push -u origin main
```

---

## Step 2 — Vercel project

### Option A — Fix the existing project (`web-alpha-two-10`)

1. Vercel → your project → **Settings → General**
2. **Root Directory** → **leave completely empty** → Save
3. **Settings → Git** → make sure the repo is the **same** GitHub repo you just pushed to, branch **`main`**
4. **Deployments** → **Redeploy** the latest (or push any small commit to trigger a build)

### Option B — Fresh Vercel project (clean slate)

1. Vercel → **Add New… → Project**
2. **Import** the GitHub repo you pushed in Step 1
3. **Root Directory** → leave **empty** (do not type `web`)
4. Add **Environment Variables** (see `DEPLOY.md`)
5. **Deploy**

---

## Step 3 — How you know it worked

Open your URL. You should see:

- Top nav: **Find loads**, **Tools**, **Lane rates**, etc.
- A **grey line** under the bar: **Build `xxxxxxx`** (short Git SHA)
- Home page: **dark sidebar** + search filters (not a tiny “Live load board” table)

If you still see the old page, you are either on the wrong Vercel project or the wrong GitHub repo/branch.

---

## Step 4 — Database (so pages don’t error)

In Vercel → **Environment Variables** → set `DATABASE_URL` (Supabase **session pooler** URL).

After the first successful deploy, run **once** from your Mac (same `DATABASE_URL` in `.env.local`):

```bash
cd /Users/damianles/LOB/web
npm run db:seed
```

That fills sample loads. See `DEPLOY.md` for Clerk keys and optional demo flags.