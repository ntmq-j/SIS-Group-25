# Password recovery, notifications and UTS venues

## Deploy checklist

1. Apply pending migrations with `npx supabase db push` only after reviewing the target project.
2. Supabase Dashboard → Authentication → URL Configuration → Redirect URLs: add
   `https://recess-uts.vercel.app/auth/reset-password` (and exact localhost URLs used for development).
3. Deploy the updated frontend. Vercel's existing SPA rewrite handles the reset route.
4. Request a reset email, follow its link, change the password, sign out and verify the new password works.
   Check SMTP delivery/rate limits before inviting real users. No admin/service-role key belongs in the browser.

Local redirect URLs are in `supabase/config.toml`; restart the local Auth stack after configuration changes.
Dashboard settings for the hosted project are separate and are not updated by `db push`.
Request responses deliberately do not disclose whether an email has an account.

## Notifications

The Chat navigation badge combines unread incoming messages, pending incoming connection requests,
and pending join requests for activities you host. Discover/Chat tabs split these counts.
Each conversation has its own unread badge. Opening a visible chat marks loaded messages read;
background tabs do not. Read cursors persist per user across browsers and refreshes.
Messages sent by the current user, deleted messages and RLS-hidden/blocked content are excluded.
Realtime invalidates counts; focus, reconnect and a 30-second refresh provide fallback recovery.
Failures show a warning instead of silently pretending there are no notifications.

Only verified conversation members can mark a message read. Clients pass a message ID, not a
timestamp or another user's ID. RLS hides other users' read timestamps; this is not a public read-receipt feature.

## UTS campuses and precincts

Source: [official UTS campus map](https://maps.uts.edu.au/map.cfm), checked 21 October 2026.
Includes City campus precincts Broadway, Haymarket and Blackfriars, plus Moore Park (MP01)
and Botany Tech Lab (BP01/BP03/BP05). The existing City Campus and area IDs are preserved.
This covers the sites/precincts shown on the official map, not every room/building or unrestricted venue access.
Users must still choose a specific public meeting point and comply with campus/site access rules.
Switching area recentres the draggable pin. The existing 250-metre site-anchor guard remains
enforced in both frontend and database; it is an approximate safety check, not a campus boundary polygon.

Availability & interests and Safety now live under Profile. My events → Edit event opens the
existing host form with persisted activity fields; database owner policies still enforce edits.

## Checks

`npm run lint`, `npm run build`, `npx supabase test db`, `npm run test:e2e`.
Database regression tests include cursor privacy/permissions, unread counts, monotonic updates,
blocked chats, realtime publication and campus reference data.

Local verification on 21 October 2026: lint/build passed, 446 database assertions and all four
existing browser E2E tests passed. Browser checks also covered the delivered recovery email →
password validation → update → fresh login flow, invalid reset links, realtime incoming
connection/message/join-request badges, clearing read messages, unread persistence after refresh,
switching conversations, campus pin recentering, My events edits surviving refresh, and
availability/interests under Profile. Profile preferences and Host Event were checked at 390px.
Only the three temporary local QA accounts and their fixtures were removed afterwards; the
shared test account and existing user data were preserved. Hosted configuration/delivery and
remote deployment still require the checklist above.
