# Recess

Recess is a campus/workplace connection app for verified students and professionals. It lets members discover approved activities and official events, share approximate availability, and meet at public map locations within their organisation-scoped community.

## Current scope

- Email/password authentication with approved university/company domains, email confirmation, Terms and Privacy consent, and verified profiles.
- Supabase-backed activities, participation requests, official events, RSVPs, availability, matching, connections, blocks, reports, and realtime chat foundations.
- Privacy-preserving realtime map: activities and approved events use public venue markers; availability is shown only as an area-level count.
- Frontend event creation/edit/cancel, event joining, calendar data from Supabase, profile editing, Leaflet + OpenStreetMap map selection, and realtime refresh subscriptions.

The app is currently an MVP. Statuses, matching, chat and moderation data are enforced by Postgres constraints, RLS policies and triggers; the browser only uses the public Supabase key.

## Run locally

Requirements: Node.js, Docker Desktop, and the Supabase CLI installed through this project.

```powershell
npm ci
Copy-Item .env.example .env
# Fill .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
npx supabase start
npx supabase db reset
npm run dev
```

Open `http://127.0.0.1:5173`. Local confirmation emails are available in the Supabase Mailpit UI at `http://127.0.0.1:54324`.

## Verification commands

```powershell
npm run lint
npm run build
npm ci --ignore-scripts
npx supabase test db
```

The database suite currently contains 396 pgTAP checks across authentication, availability, activities, events/RSVPs, realtime map, matching, blocks, reports, chat and the Phase 6 security audit.

## Architecture

The frontend uses Supabase Auth, PostgREST and Realtime directly for operations protected by RLS. Sensitive or validation-heavy writes use Supabase Edge Functions. See:

- [Frontend/backend integration](docs/backend/frontend-integration.md)
- [API contract](docs/backend/api-contract.md)
- [Phase 6 readiness and remaining MVP gaps](docs/backend/phase6-readiness.md)
- [Environment setup](docs/backend/environment-setup.md)
- [Release checklist](docs/backend/release-checklist.md)
- [Backend contribution guide](docs/backend/CONTRIBUTING.md)

Database changes are migration-only. Never commit `.env`, a database password, or a `service_role` key.
