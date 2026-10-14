# Backend Environment Setup

Phase 0 deliverable: `.env.example` + this document.

## What these variables are for

Recess's frontend talks to Supabase Auth, PostgREST and Realtime using the
public anon key; access is protected by Row Level Security. Activity/event
creation, event RSVP and matching suggestions also have authenticated Edge
Function routes. Blocks, reports, chat and connection rules currently rely
on database RLS policies and triggers; do not assume every database feature
already has a frontend screen or a dedicated Edge Function.

## One-time setup (each teammate does this locally)

1. Copy the template (PowerShell):
   ```bash
   Copy-Item .env.example .env
   ```
   On macOS/Linux, use `cp .env.example .env`.
2. Get the project URL and anon key:
   - Ask whoever created the Supabase development project (Phase 0 —
     "Create Supabase development project") for the project, or open it
     yourself in the [Supabase dashboard](https://supabase.com/dashboard).
   - Go to **Project Settings -> API**.
   - Copy **Project URL** -> `VITE_SUPABASE_URL`.
   - Copy the **`anon` `public`** key -> `VITE_SUPABASE_ANON_KEY`.
     Do **not** copy the `service_role` key here.
3. Save `.env`. It's already listed in `.gitignore` — it will never be
   committed. Restart `npm run dev` after editing it (Vite only reads
   `.env` files at startup).

## Variable reference

| Variable | Where it's used | Safe for the browser? |
|---|---|---|
| `VITE_SUPABASE_URL` | `src/lib/supabaseClient.js` | Yes |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabaseClient.js` | Yes — RLS is what actually protects data, not secrecy of this key |
| `VITE_MAPBOX_TOKEN` (pending) | map components, once a provider is chosen | Yes, if a public/scoped token |

Any variable prefixed `VITE_` is inlined into the client bundle at build
time and is visible to anyone using the app. Only ever put values here
that are safe to be public.

## Server-side / Edge Function secrets (not in this .env)

The `service_role` key and anything else that must bypass RLS is **never**
stored in this frontend `.env` or committed to the repo. The event Edge
Functions in this repository use the caller's JWT and do not require a
service-role key. If a future privileged function needs one, store it only in
Supabase's function secrets:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... 
```

Deploy the current Edge Functions with:

```bash
supabase functions deploy create-activity
supabase functions deploy create-official-event
supabase functions deploy rsvp-to-event
supabase functions deploy refresh-suggestions
```

For local development, run `supabase functions serve` alongside the Vite
server. The frontend falls back to the same RLS-protected PostgREST operation
when the local Edge Function runtime is not running.

## CORS, Auth redirects, and function logs

Local Supabase automatically permits `http://localhost:5173` and
`http://127.0.0.1:5173`. Hosted Edge Functions require an explicit
comma-separated `ALLOWED_ORIGINS` secret. Set it only after choosing the
frontend host; use origins (scheme + hostname + optional port), without a
path or trailing slash:

```powershell
npx supabase secrets set ALLOWED_ORIGINS="https://your-real-frontend-host" --project-ref <project-ref>
```

Multiple origins can be comma-separated, for example production and staging.
Do not use `*`. Because Recess has not chosen a production host yet, no
production URL is included in this repository. Once the host is selected:

1. Set the production origin as **Site URL** and add
   `https://<your-production-host>/auth/callback` under **Supabase Dashboard →
   Authentication → URL Configuration → Redirect URLs**. Add the actual
   hostname, not the placeholder.
2. Set the same origin in the Edge Function `ALLOWED_ORIGINS` secret above.
3. Deploy the frontend and Edge Functions, then test email confirmation and
   sign-in redirects from the deployed domain.

The committed `supabase/config.toml` contains local-only redirect URLs; it does
not configure a hosted project's Dashboard settings. Edge Functions emit
structured request-completion/error logs with duration, status and a request
ID. Inspect them in **Supabase Dashboard → Edge Functions → Logs** and match a
log entry to a client response via its `X-Request-Id` header. Logs omit request
bodies, tokens and personal data. For the MVP this uses Supabase's built-in
function logs; external alerting and dashboards are not configured yet and
should be added once the hosting/monitoring provider is selected.

## Using the client in code

```js
import { supabase } from '../lib/supabaseClient'

const { data, error } = await supabase.from('organisations').select('*')
```

## Troubleshooting

- **Blank page / console error "Missing Supabase environment variables"**:
  `.env` is missing or wasn't filled in — see step 1-2 above, then restart
  `npm run dev`.
- **401 / RLS errors on every query**: usually means the anon key or URL
  is wrong, or a table's RLS policy isn't set up yet.
