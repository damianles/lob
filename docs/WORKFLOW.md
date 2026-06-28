# LOB — your workflow with Cursor

This is **your** reference. Bookmark it. Use it at the start of every new chat.

For deep project context (agents): **`AGENTS.md`** at the repo root.  
For always-on agent behavior: **`.cursor/rules/lob-core.mdc`**.

---

## New chat checklist

Run through this before you ask the agent to build anything.

### You (sense-check)

- [ ] **New chat** for a new feature or bug (not a 50-message thread)
- [ ] Dev server running? → http://localhost:3000 loads
- [ ] I know **one clear outcome** for this session (not "keep building LOB")
- [ ] I know **what not to touch** (optional but helps)

### Paste this to start the chat (recommended)

Copy into the first message of a new chat:

```
Read AGENTS.md and docs/WORKFLOW.md.
Give me my new-chat workflow checklist (brief), then wait for my task.
```

If you already know the task, use this instead:

```
Read AGENTS.md.
Task: [one sentence — what + where]
Do not change: [auth / schema / unrelated files]
Files: @[paths if you know them]
```

### Agent (what you should get back)

- A short **checklist recap** (from the section above)
- A question: **"What do you want to work on?"**
- **No coding** until you reply with the task

---

## Every session workflow

| Step | You | Agent |
|------|-----|--------|
| 1. Start | New chat + paste starter (above) or scoped task | Checklist first, or proceed if task is scoped |
| 2. Scope | One outcome, `@` relevant files/folders | Read `AGENTS.md` + only those files |
| 3. Build | Review diffs; test in browser | Minimal diff, match existing style |
| 4. Verify | Click through the flow you changed | Run commands you ask for; don't commit unless asked |
| 5. Ship | When ready: commit, push, Vercel redeploy | Follow `SHIP.md` only when you request it |

---

## When to start a **new chat** vs continue

| New chat | Same chat |
|----------|-------------|
| New feature | Tiny fix on what you just built |
| New bug in a different area | "Change the button label we added" |
| Agent seems confused or repetitive | Follow-up with one clarifying answer |
| After a long break | — |

---

## Local dev quick reference (Windows)

```powershell
cd C:\Users\damia\Projects\lob

# If "running scripts is disabled":
& "C:\Program Files\nodejs\npm.cmd" run dev

# Normal (after Set-ExecutionPolicy RemoteSigned):
npm run dev
```

- **Env file:** `.env` — open with **Ctrl+P** → type `.env` (not `.env.example`)
- **After editing `.env`:** stop server (Ctrl+C), start again
- **Port stuck / infinite loading:** only one `npm run dev`; kill old terminal, restart
- **DB ping:** `npm run db:ping`
- **Reset local schema (fresh):** `npx prisma db push` then `npm run db:seed`

---

## Token-saving habits

1. **Don't** ask for "full project review" unless you need an audit
2. **Do** `@` specific files: `@src/components/load-card.tsx`
3. **Do** say "read AGENTS.md first" once per chat — not the whole codebase
4. **Don't** mix three features in one chat
5. **Pin memories** only for lasting decisions (e.g. "no Docker locally") — not code details

---

## Key docs in this repo

| File | Purpose |
|------|---------|
| `docs/WORKFLOW.md` | **This file** — your process |
| `AGENTS.md` | Project map for agents |
| `README.md` | Setup overview |
| `DEPLOY.md` | Vercel, Supabase, Clerk production |
| `SHIP.md` | Short deploy steps |
| `MASTER_TESTING.md` | Admin + multi-user testing |

---

## Clerk & accounts (reminder)

- Dashboard: https://dashboard.clerk.com
- Local keys live in `.env` — restart dev server after changes
- Account setup in app: `/onboarding`
- Admin testing: `MASTER_TESTING.md`, `/admin/test-lab`

---

## Example good task messages

**Good:**
> Read AGENTS.md. Add a "Copy reference" button on the shipment progress page (`src/app/loads/[loadId]/page.tsx`). Match existing button styles in `lob-button-styles.ts`. Don't change API routes.

**Too vague:**
> Continue building the app.

**Too broad:**
> Review the entire codebase and improve everything.
