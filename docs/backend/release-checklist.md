# Phase 6 release checklist

Use this checklist before merging a release branch or updating `recess-dev`.

## Local verification

- [ ] `npm ci` completes without lockfile errors.
- [ ] `npm run lint` completes; review warnings before release.
- [ ] `npm run build` completes.
- [ ] Docker Desktop is running.
- [ ] `npx supabase db reset` applies every migration and seed cleanly.
- [ ] `npx supabase test db` passes all pgTAP checks.
- [ ] Sign up with an approved university/company domain, confirm the email in Mailpit, and verify the profile becomes `verified`.
- [ ] Confirm public email domains are rejected and unverified users cannot use core features.
- [ ] Create, edit, cancel and join an activity; verify the map and feed refresh after a second session changes it.
- [ ] RSVP and withdraw from an official event; verify the calendar refreshes from `event_rsvps`.
- [ ] Move an event pin outside its selected area and confirm publishing is blocked; move it back inside the allowed radius and confirm publishing succeeds.
- [ ] Verify blocks, reports and chat visibility do not reveal private rows or exact user positions.

## Remote `recess-dev` deployment

```powershell
npx supabase link --project-ref <project-ref>
npx supabase db push --linked
npx supabase functions deploy create-activity --project-ref <project-ref>
npx supabase functions deploy create-official-event --project-ref <project-ref>
npx supabase functions deploy rsvp-to-event --project-ref <project-ref>
npx supabase functions deploy refresh-suggestions --project-ref <project-ref>
```

After deployment:

- [ ] `npx supabase migration list --linked` has no local-only migrations.
- [ ] `npx supabase functions list --project-ref <project-ref>` shows all four functions as `ACTIVE`.
- [ ] Dashboard Auth settings have email provider and confirmations enabled, with the deployed frontend URL in the redirect allow-list.
- [ ] Organisation/domain seed data exists in the remote database; do not use sample domains in production.
- [ ] Run one end-to-end smoke test against the deployed URL using a non-sensitive test account.

Never put `service_role`, database passwords, or access tokens in the frontend `.env` or GitHub.
