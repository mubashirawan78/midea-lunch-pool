# Midea Lunch Pool — Netlify edition

This is the Netlify-ready edition. Use this folder instead of the earlier Cloudflare/Sites ZIP.

It uses standard Next.js, Netlify server functions, Supabase Auth and Supabase Postgres. No Cloudflare, D1, Vinext or ChatGPT sign-in is required. The Midea interface and bill splitting behavior are preserved.

## Deploy in order

### 1. Create a free Supabase project

Create a project at https://supabase.com/dashboard and save its database password privately. This application does not need that password in Netlify.

In the project's SQL Editor, open and run **supabase/setup.sql** from this folder. It creates the shared lunch_pools table and its indexes, enables Row Level Security, and denies direct browser access. The application server is the only component allowed to modify the table.

### 2. Add your 5–10 team accounts

In Supabase **Authentication → Users → Add user → Create new user**, create an account for each colleague with their actual work email and a strong password. Enable **Auto Confirm User** when creating the account, so no confirmation email is required. Share each person's credentials privately.

In Authentication settings, disable public user sign-ups. The application has no registration screen and additionally checks an exact email allowlist on every authenticated request.

This edition uses email + password sign-in. It does not depend on magic-link emails or SMTP for daily use. Password resets are handled by the organizer in Supabase for this first version; a self-service reset flow is not included. Changing a password in Supabase is an account-management operation, not an app deployment.

### 3. Get the Supabase connection settings

From the project's Connect dialog or project API settings, copy:

- Project URL → SUPABASE_URL
- Publishable key → SUPABASE_PUBLISHABLE_KEY
- Secret key → SUPABASE_SECRET_KEY

If your project shows legacy keys, the anon key can be used as the publishable key and the service_role key as the secret key. The secret/service_role key bypasses database RLS; keep it ONLY in server-side environment settings. Never put it in GitHub, frontend code, chat, or a NEXT_PUBLIC_ variable.

### 4. Create a private GitHub repository

Extract the ZIP. Upload this folder's **contents** to a new private GitHub repository. The repository root should contain package.json, package-lock.json, netlify.toml, app/, lib/ and supabase/.

Keep .gitignore and .env.example. Do not upload node_modules/, .next/, work/, or your real .env.local file. The supplied ZIP excludes generated directories and contains no real credentials.

### 5. Import the repository into Netlify

Create or use your free Netlify account, then choose **Add new project → Import an existing project → GitHub** and select the repository.

Use these settings (netlify.toml already supplies the build command and publish directory):

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Base directory | Blank if package.json is at the repository root |
| Build command | npm run build |
| Publish directory | .next |
| Node version | 22 |

Netlify automatically installs its Next.js adapter. Do not use Netlify Drop/drag-and-drop for this source ZIP; this app needs a build and server functions. Do not configure a static export or a redirect that sends every path to index.html.

### 6. Add these four environment variables

In Netlify project configuration, add the following variables and make them available to **both Builds and Functions/runtime**. Mark SUPABASE_SECRET_KEY as secret if that option is available.

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key
TEAM_EMAILS=you@company.com,person2@company.com,person3@company.com
```

Replace every placeholder. TEAM_EMAILS must list the exact emails created in step 2, separated by commas. Matching is case-insensitive. The app denies access if the list is empty or the signed-in email is not included. No company domain is assumed.

Do not prefix these variables with NEXT_PUBLIC_. The browser never connects directly to your database. Authentication tokens are stored in HttpOnly, SameSite cookies; production cookies are Secure. API routes validate each session with Supabase before accessing data.

### 7. Deploy and test with two users

Deploy the project. If it deployed before adding variables, trigger a fresh deployment. Open the provided https://your-site.netlify.app address.

1. Sign in as the organizer and create a pool with a future Riyadh-time deadline.
2. Join if the organizer is also eating. The organizer does not join automatically.
3. Copy the invite and open it in a private browser window. Sign in as another allowed colleague and join.
4. Return to the organizer and refresh. Add food lines, select participants, and enter fees, discount and the actual receipt total.
5. Save, then finalize. Check both users see amounts adding up to the final total.
6. The colleague marks paid. The organizer confirms receipt. The order becomes settled and moves to history.
7. Confirm a signed-out browser cannot access pool data and an email outside TEAM_EMAILS is rejected.

Automatic refresh runs once per minute while the tab is visible and not editing. The Refresh button updates immediately. This lowers request usage on free hosting.

### 8. Share with your team

Share your Netlify URL after the two-user check. Colleagues do not need GitHub, Netlify or Supabase dashboard accounts; they only need the app accounts created in step 2. A free netlify.app address is sufficient.

## Local use

Install Node.js 22.13 or newer. Copy .env.example to .env.local and fill it with your own project's settings. Then:

```text
npm ci
npm run dev
```

Open the printed local URL. Local use connects to the Supabase project specified in .env.local; use a separate project for disposable tests.

If a Windows corporate certificate store causes UNABLE_TO_VERIFY_LEAF_SIGNATURE during installation, use Node's system CA support for that PowerShell session:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npm ci
```

Do not disable TLS validation.

## Checks

```text
npm test
npm run typecheck
npm run build
node scripts/smoke.mjs
```

The 23 tests cover money calculations, rounding, lifecycle, roles, allowlist matching, unsafe redirects, cross-origin requests, invitation access, and concurrent-update conflicts. API tests use an in-memory repository and an injected authenticated identity, so they do not contact Supabase or use real team data.

The HTTP smoke test starts the built Next.js server with no credentials and checks the public pages, missing-setup response and cross-origin login rejection. A successful build does not prove your Supabase credentials or deployed database are configured; complete the two-user check above.

## Data and security

- API credentials are server-only, and table access is revoked from Supabase's anon/authenticated roles.
- Every pool request verifies the Supabase user and exact team email allowlist.
- Lists show only pools the user owns or has joined. An allowed teammate with an unguessable invite URL can view and join that pool; treat invite links as team-only.
- Only the organizer edits food, locks/finalizes the bill, or confirms receipt of payment.
- Every update compares the previous revision to prevent lost concurrent changes.
- The organizer's own share is marked covered at finalization. Other shares require payment reporting/confirmation.
- Published bills are locked. Receipt attachments and post-finalization corrections are not included.
- The app tracks payments; it never transfers money or orders from a restaurant automatically.
- The old version's local D1 data is not imported. This edition starts with a fresh Supabase table.

## Troubleshooting

**Setup is required:** add all four environment variables in Netlify and redeploy. Check runtime scope as well as build scope.

**Unable to sign in:** confirm the account exists in Authentication → Users, is confirmed, uses the correct password, and its email appears exactly in TEAM_EMAILS. Do not enable public sign-ups to fix a missing account.

**Unable to access lunch data:** run supabase/setup.sql, check the project URL, and confirm the secret/service_role key belongs to the same project. Check Netlify function logs for the detailed database error.

**Pool changed:** another participant updated it. Refresh, reapply the edit, then save.

**Blank/static deployment:** import the repository as Next.js and use .next; do not upload this source ZIP with Netlify Drop.

**Supabase project paused:** resume it in the Supabase dashboard. Free-tier projects may pause after inactivity.

## Official references

- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- https://docs.netlify.com/start/quickstarts/deploy-from-repository/
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/pricing
- https://www.netlify.com/pricing/

Netlify and Supabase free plans have usage limits. The app is intended for your small office team, but remaining free depends on actual usage.

