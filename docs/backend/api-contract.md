# API Response Format

Phase 0 deliverable: "Define API response format" -> this document.

Recess has two ways the frontend talks to the backend (PRD section 10):

1. **Direct Supabase client queries** (`supabase.from(...).select()` etc.)
   for operations protected by RLS, such as reading approved areas, profiles,
   activities, event data and participants.
2. **Supabase Edge Functions** for activity/event creation, RSVPs and matching
   suggestions. Blocks, reports, connections and chat are currently enforced
   by database RLS/triggers; not all of those backend features have a frontend
   screen or Edge Function yet.

This document defines the response shape for Edge Functions. Direct client
queries follow whatever shape `supabase-js` already returns
(`{ data, error }`) -- no extra wrapping needed there.

## Success response

```json
{
  "data": { "...": "..." },
  "error": null
}
```

- `data` is always present on success, `null` on failure.
- HTTP status: `200` for a normal success, `201` for a resource created
  (e.g. `create-activity`).

## Error response

```json
{
  "data": null,
  "error": {
    "code": "invalid_domain",
    "message": "person@gmail.com is not an approved institutional email."
  }
}
```

- `error.code` is a stable, machine-readable `snake_case` string the
  frontend can switch on. `error.message` is safe to display directly; never
  return SQL errors, constraint names or stack traces to the client.
- HTTP status follows the error's nature:
  - `400` -- validation error (bad input shape, invalid domain, etc.)
  - `401` -- not authenticated
  - `403` -- authenticated but not authorised (unverified account, blocked, not a participant, etc.)
  - `404` -- referenced resource doesn't exist (or isn't visible under RLS)
  - `409` -- conflict (duplicate request, already connected, activity full)
  - `429` -- rate limited (messages, requests, activity creation)
  - `500` -- unexpected server error

## Error code reference (grows per phase)

| Code | Meaning |
|---|---|
| `invalid_domain` | Email domain isn't in `organisation_domains` |
| `consent_required` | Terms and Privacy Policy consent was not provided |
| `not_verified` | Account exists but email isn't verified yet |
| `unsupported_account_type` | The domain resolves to an organisation type that cannot join the MVP |
| `forbidden` | A protected account/profile field cannot be changed by the client |
| `invalid_request` | Required fields or request JSON are invalid |
| `unauthorized` | The caller is not signed in |
| `method_not_allowed` | The function only accepts the documented HTTP method |
| `conflict` | The request conflicts with an existing record |
| `request_failed` | A safe generic error for an unexpected database failure |
| `already_connected` | Connection request rejected -- already connected |
| `not_connected` | Private message rejected -- the two users are no longer connected (history stays readable) |
| `request_pending` | Duplicate connection/join request |
| `activity_full` | Activity already at its participant limit |
| `invalid_area` | `area_id` does not belong to the given `location_id` (official events) |
| `expired` | The activity/event/availability referenced has expired |
| `rate_limited` | Too many requests/messages in the current window |
| `invalid_time_window` | Activity start/end time is invalid (in the past, end before start, or over the 4-hour max) |
| `activity_cancelled` | The activity has been cancelled and can no longer be joined or edited |
| `invalid_transition` | The requested participant status change isn't allowed (e.g. a declined request trying to become pending/accepted again) |
| `matching_unavailable` | Matching suggestions could not be generated |

Blocks are deliberately reported as `forbidden`, not `blocked`, so a
blocked user can't tell -- see `docs/backend/moderation.md`.

Database functions may still surface SQLSTATE/constraint errors through
direct PostgREST calls. The stable JSON envelope applies to the Edge Function
routes listed below.

## Naming

Edge Function routes are `kebab-case` verbs, matching Backend Docs v0.1,
e.g. `POST /functions/v1/create-activity`,
`POST /functions/v1/respond-to-connection-request`.

Matching suggestions are available at `POST /functions/v1/refresh-suggestions`.
The route returns at most three ranked results and rejects signed-out or
unverified users.

## Current Edge Function routes

The current frontend integration uses these authenticated POST routes:

| Route | Success status | Purpose |
|---|---:|---|
| `/functions/v1/create-activity` | `201` | Create a verified user's activity after validating tags, area and time window. |
| `/functions/v1/create-official-event` | `201` | Create an organisation event subject to organisation-admin RLS and area validation. |
| `/functions/v1/rsvp-to-event` | `200` | Create or update the caller's `going`/`interested` RSVP. |
| `/functions/v1/refresh-suggestions` | `200` | Return at most three deterministic matching suggestions. |

All four routes return the documented success/error envelope. The first
three routes can also be exercised through direct RLS-protected PostgREST
calls during local development when the Edge Function runtime is not
running. Hosted environments should deploy and use the function routes. No
route accepts a service-role key from the browser.

The map and calendar do not have custom API routes: they call the
`active_map_points` RPC and RLS-filtered `activities`, `activity_participants`,
`official_events` and `event_rsvps` queries directly. Realtime notifications
only trigger those filtered reads again.
