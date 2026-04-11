# Master testing account (ADMIN)

We **cannot** create a shared password for you — **Clerk** owns sign-in. There is no “built-in” master login in the repo.

## Give yourself full admin access

1. **Sign in** to your live (or local) app with your normal Clerk account (the email you use day to day).
2. On your machine, point at the **same database** as production (`DATABASE_URL` in `web/.env.local` = Vercel’s value).
3. Run:

```bash
cd /Users/damianles/LOB/web
npm run set-admin -- your-email@example.com
```

4. **Sign out** and **sign in** again (or hard refresh).  
   - **Admin · Carriers** and **Admin · Companies** appear in the top nav only for `ADMIN`.  
   - You can use **admin APIs**, see **mill names** on loads (per `shipper-visibility` rules), and open **analytics** without a company.

`ADMIN` users have **no `companyId`**, so you **cannot post loads** as a mill until you either use **Account setup** as a second Clerk user or temporarily use a non-admin account for mill flows.

## Test “both sides” realistically

| Role | How |
|------|-----|
| **Mill / seller** | Second Clerk user (or incognito) → Account setup → mill → post loads. |
| **Carrier** | Third user or same incognito → trucking company → book (use `LOB_AUTO_APPROVE_CARRIERS=true` on preview to skip queue). |
| **Ops / you** | Your email after `set-admin` → admin pages + full visibility. |

## Security

Remove or rotate admin access before real customers: set affected users back to `SHIPPER` / `DISPATCHER` in Prisma or via a support script.
