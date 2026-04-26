# Ship code → see it live (Vercel)

**Rule:** Pushing to GitHub `main` is what starts a new deploy. Nothing is automatic until the code is **committed in `web/`** and **pushed**.

## Every time you want changes live

```bash
cd /Users/damianles/LOB/web
git status
git add -A
git commit -m "Describe your change in one line"
git push origin main
```

Wait ~1–2 minutes, then open your Vercel URL. Hard refresh: **Cmd+Shift+R** if the browser looks old.

**Vercel:** **Root Directory must be empty** (not `web`) — this repo *is* already the app; there is no extra `web` folder inside Git.

## If something fails

- **Not a git repo?** You are in the wrong folder. `cd` into **`.../LOB/web`**, not `.../LOB`.
- **Auth errors on push?** Use GitHub CLI (`gh auth login`) or SSH keys for `git@github.com:...`
- **Env / DB:** see `DEPLOY.md`.

Longer version (older notes): `PUSH_AND_VERCEL.md`.
