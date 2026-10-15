# Recess functional review — 15 October 2026

## Verdict

The six issues identified in the initial review are fixed and verified locally. The local frontend, local Supabase database, and existing public browser checks are passing. Production readiness still requires deployment-specific checks (remote migration/function deployment, production Auth redirects/CORS, real email delivery, and broader authenticated E2E coverage).

Scope: branch `codex/phase6-completion`, current working tree. Frontend: `http://127.0.0.1:5173`; Supabase: `http://127.0.0.1:54321`. The fixes and interest catalogue migration are included in this branch. The shared/remote Supabase schema has not been updated; a Git push does not apply database migrations.

## Findings and resolution

The status-post timestamp display has also been changed from a raw ISO value to a localized, readable label (for example, “Today at 7:40 PM”); the full local date/time remains available on hover.

1. **Resolved — Activity joining and RLS.** `joinActivity` now obtains the signed-in user and inserts `user_id`, `activity_id`, and `status`. RLS remains enforced; no policy weakening was needed. Database security tests pass.

2. **Resolved — Official-event details blank page.** Each map subscription now receives a unique channel name and is independently cleaned up. The duplicate Supabase Realtime callback registration no longer occurs. The root is also single-mounted in development to avoid the React-Leaflet StrictMode cleanup race when opening Host Event.

3. **Resolved locally — Interests catalogue.** Migration `20261015090000_seed_interest_catalogue.sql` adds an idempotent default catalogue of 12 interests. Preferences now renders selectable interests. The migration must still be applied to the shared/remote project before deployment.

4. **Resolved locally — Mobile overflow.** The feed grid, event cards, Host Event form, datetime fields, and map container now allow narrow sizing. Playwright measured document/body width equal to the viewport at both 390px and 320px, including the Host Event form.

5. **Resolved — Activity detail refresh.** The selected-event refresh now handles both activities and official events. It refreshes the current user's participation and the attendee count after map/database changes.

6. **Resolved — Activity attendee count semantics.** Activity counts now subtract the host from the RPC's accepted-row count and the details label explicitly says the limit is for additional people. Official-event counts retain their existing going-count semantics.

## Checks performed

| Feature/check | Result and evidence |
| --- | --- |
| Lint / production build | Pass. Largest emitted JS chunk about 484 KB before gzip. |
| Browser E2E suite | 4/4 pass, including public landing/auth entry points, legal pages, and the authenticated two-user join/host-approval flow. |
| Database suite | 418/418 across 20 files pass, including security/RLS checks and the rule allowing ten open activities per host while rejecting the eleventh. These did not catch the frontend's missing join field or duplicate channel. |
| HTTP smoke load | 50/50 requests succeed, about 10ms average in the initial run. Only the local Vite root URL is exercised; this is not backend capacity testing. |
| Sign in / sign out | Verified through browser with the seeded account. |
| Signup/email confirmation | Verified through local Auth API and Mailpit: no session at signup, profile pending, email link returns 303, profile becomes verified, password login succeeds. A public Gmail domain is rejected, but its API message is generic (`Database error saving new user`). Full hosted email delivery and frontend callback journey remain untested. |
| Profile | Browser update of role/bio succeeds with the pre-existing own-ID update fix. Original values restored after testing. |
| Host Event | Opens without a blank page; create, reopen/edit/save and cancel succeed. Category/tag and location data appear on the feed/map. Area switch and pin dragging work. More-than-four-hour window displays a warning and disables publishing. Full geofence boundary and every category/validation combination were not manually exercised. |
| Persistence | A newly created event and status remain visible in another independently signed-in session; status survives page reload. |
| Status timestamp | Browser displays a human-readable local date/time label rather than the raw ISO timestamp. |
| Realtime map | Approving an official event in one session adds it to another session's already-open feed/map without reloading. Expiry timing, reconnect and offline recovery were not manually verified. |
| Availability / interests | Browser availability creation succeeds. The Preferences view now shows the default catalogue (Coffee, Cooking, Gaming, Hiking, Live music, Movies, Reading, Sports, Study groups, Technology, Travel, Volunteering). Interest selection is available for matching. |
| Matching / connections | With compatible availability and a temporary shared interest, matching suggests the other user. Browser Connect creates a pending incoming request; browser acceptance creates a private conversation. Decline/resend edge cases were not manually exercised. |
| Activity joining / host inbox | The join payload now includes the authenticated user's ID, preserving the existing RLS policy. The automated two-user Playwright regression passes: a disposable guest requests to join, the host approves it from Host inbox, and the guest receives the updated going state and attendee count. Temporary users and activity are verified absent after cleanup. |
| Group chat | After the above fixture setup, browser sending delivers to the other open session in realtime. Deleting the sender's message succeeds; database read returns blank body and a deletion timestamp. |
| Private chat | Browser sending succeeds; the peer's authenticated API reads the message. Two-browser private-chat delivery was not separately repeated. |
| Organisation admin | Ordinary account sees the access restriction. Temporary local admin can create a draft and approve it. Temporary admin account removed after testing. |
| Official RSVP/capacity | Official details no longer uses a duplicate Realtime channel. Authenticated Edge Function requests return going for the first user and waitlisted for the second at capacity 1. |
| Calendar | Shows accepted activity and official RSVP. Browser Cancel RSVP succeeds and promotes the waitlisted attendee to going. Activity Leave and every cancellation state were not individually exercised in the browser. |
| Safety | Browser Report and Block create records. After blocking, peer's authenticated private-message query returns no messages and sending is forbidden. Live clearing of already-rendered content was not verified. |
| Mobile | Playwright confirms no horizontal overflow at 390×844 or 320×800, including the feed and Host Event form. Other device sizes and touch/keyboard accessibility need separate coverage. |

## Cleanup and next steps

Temporary users, admin access, activities, official event, conversations/messages, connections, reports, blocks, status post, availability rows and interest fixture created by this check were removed from the **local** stack only. The original seeded `test@student.uts.edu.au` account remains; its profile was restored. No reset of the user's database was run.

Apply the interest migration to the shared Supabase project when approved. The join/host-approval regression is now automated locally; extend the same multi-account coverage to official-event details and RSVP, and verify production Auth redirects/CORS, real email delivery, remote migrations/functions, expiration and reconnect behavior on staging before claiming production readiness.

## Automated authenticated regression

`tests/e2e/activity-join-approval.spec.js` provisions two disposable verified users through the local Supabase Admin API, signs them into isolated browser contexts, creates an activity, requests to join, approves the request from the host inbox, and asserts the guest's status and attendee count update. The Playwright config reads API keys only from `npx supabase status -o env`, rejects non-local Supabase URLs, and launches an isolated Vite server on a free local port. Run `npx supabase start` first, then `npm run test:e2e`. Test users and their activity are removed in cleanup.
