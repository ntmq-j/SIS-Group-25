# Release smoke tests

Automated checks cover database constraints/RLS, public-page navigation and a
small HTTP availability baseline. The following checks require real accounts,
the configured Supabase environment, and (for realtime) two browser sessions.

## Email verification

1. Register a new account with an approved organisation email.
2. Confirm the email from the message and follow the redirect back to Recess.
3. Sign in; confirm the account can use core features only after verification.
4. Repeat using a public email domain and confirm registration is rejected.

## Availability, matching and connections

1. With two verified accounts in the same organisation, add overlapping
   availability in compatible areas and at least one shared interest.
2. Confirm each can see the other as a suggestion, without seeing exact GPS.
3. Send a connection request; as the other account accept it.
4. Confirm the request disappears from pending and a private conversation is
   available.

## Host inbox and activity chat

1. Account A hosts an activity; account B requests to join.
2. Confirm A sees the request in Host inbox and can accept or decline it.
3. After acceptance, confirm both participants can use the activity chat.
4. Confirm a declined or unrelated account cannot send to that chat.

## Status post persistence, realtime and privacy

1. Publish a status, refresh the page, and confirm it remains visible.
2. In a second session signed into the same organisation, confirm the new post
   appears without refresh.
3. Sign into a different organisation and confirm the post is not visible.
4. Confirm availability is not exposed by raw Realtime subscriptions and no
   precise user GPS location is stored in an availability row.

## Organisation event admin

1. Sign in as an account explicitly granted organisation-admin status.
2. Create an official event draft, approve it, and confirm it appears on the
   map for verified users.
3. Confirm a non-admin cannot create, approve, or cancel that organisation's
   official events.

## Commands

- `npm run test:e2e` — public browser smoke checks (install browser with
  `npx playwright install chromium` the first time).
- `npm run test:load` — default 50-request local HTTP smoke check. Set
  `LOAD_URL`, `LOAD_CONCURRENCY`, and `LOAD_ROUNDS` to customize it. This is
  not a capacity benchmark and does not load-test authenticated DB queries,
  Edge Functions, or realtime channels.
