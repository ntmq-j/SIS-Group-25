# Phase 6 readiness and remaining MVP gaps

## Implemented and verified

- Database migrations, RLS, constraints and triggers cover authentication,
  availability, activities, official events/RSVPs, matching, connections,
  blocks, reports and chat foundations.
- Activity/event markers are public venue points; presence is aggregated by
  area and never exposes a user's live coordinates.
- The Host Event form lets the user choose a campus area and 1–5 additional
  participants; changing the area recentres the public marker before the
  250-metre validation is applied.
- The frontend persists activities, profile edits, RSVPs and calendar data in
  Supabase. Map and calendar changes refresh through Realtime subscriptions.
- Edge Function responses use one safe `{ data, error }` envelope and do not
  send raw SQL errors to the browser.
- Internal trigger/Auth-hook functions are no longer callable through public
  RPC, and `email_domain` has a fixed `search_path`.
- Local verification: `npm ci`, lint, build, `db reset`, and 387 pgTAP checks.

## Still outside the current frontend MVP

- There is no dedicated frontend screen yet for matching suggestions,
  connection requests, blocking/reporting or chat. Their backend schema,
  policies and functions are present and can be integrated in a later UI task.
- Official-event creation/approval is an organisation-admin backend route;
  the regular member UI currently focuses on user-created activities and
  RSVPs/calendar consumption.
- Activity join requests are stored as `pending`, but there is not yet a host
  inbox for accepting or declining those requests.
- The small status composer is still local React state and its posts disappear
  on refresh; it is not durable activity/availability data.
- Users cannot yet create or edit availability or interests from the frontend,
  so map presence aggregation and matching require data from other paths.
- Automated browser/E2E tests and load testing are not included. The release
  smoke-test checklist remains required for email confirmation, multi-session
  realtime behaviour and remote deployment.
- The production frontend still needs a hosting URL added to Supabase Auth's
  redirect allow-list before external sign-up links can be tested.

These are explicit scope boundaries, not hidden limitations. Do not mark the
MVP release complete until the manual smoke tests in
`docs/backend/release-checklist.md` have been run against the intended
environment.
