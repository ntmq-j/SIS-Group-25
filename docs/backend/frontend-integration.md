# Frontend/backend integration

This is the Phase 6 integration reference for the current MVP. The frontend does not connect to Postgres directly; `@supabase/supabase-js` talks to Supabase Auth, PostgREST and Realtime using the public anon key. RLS and database triggers enforce the access boundary.

## Direct Supabase operations

Use the shared client in `src/lib/supabaseClient.js` for:

- Auth sign-up/sign-in and email confirmation.
- Reading approved `areas` and the current user's `profiles` row.
- Calling `active_map_points` for organisation-scoped map data.
- Joining activities through `activity_participants`.
- Loading the calendar from `event_rsvps` and accepted `activity_participants`.
- Updating the current user's editable profile fields.

Every read/write must handle the returned `{ data, error }` object. A 403/RLS error is expected for a signed-out, unverified or non-member caller and must be shown as a safe user-facing message.

## Edge Function operations

The frontend invokes these POST routes through `supabase.functions.invoke`:

| Function | Purpose | Client fallback |
|---|---|---|
| `create-activity` | Validate and create a user activity | RLS-protected `activities` insert for local development only |
| `create-official-event` | Create an organisation event | RLS-protected `official_events` insert for local development only |
| `rsvp-to-event` | Create/update an event RSVP | RLS-protected `event_rsvps` upsert for local development only |
| `refresh-suggestions` | Return the top three matching candidates | None; the function must be deployed for matching |

Hosted deployments must use the Edge Function path. The local fallback exists only because a developer may run the Vite app without `supabase functions serve`; it does not bypass RLS or use a service-role key.

## Realtime subscriptions

`subscribeToMapChanges` refreshes the privacy-preserving map after activity, participant, official-event or RSVP changes. `subscribeToCalendarChanges` refreshes the calendar after RSVP, activity, participant or official-event changes. These subscriptions only trigger a fresh RLS-filtered query; they never expose raw availability or another user's private coordinates.

## Payload examples

```js
await supabase.functions.invoke('create-activity', {
  body: {
    area_id,
    title,
    description,
    category: 'coffee_break',
    tags: ['new students'],
    participant_limit: 3,
    start_time,
    end_time,
    location_label: 'UTS Building 11 foyer',
    latitude,
    longitude,
  },
})

await supabase.functions.invoke('rsvp-to-event', {
  body: { event_id, status: 'going' },
})
```

Coordinates are a public event marker and must be within the selected area's marker radius. They are never a user's live location. Edge Function success responses use `{ data, error: null }`; failures use `{ data: null, error: { code, message } }`. Raw database error details are logged server-side only.
