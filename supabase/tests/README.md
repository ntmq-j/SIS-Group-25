# Backend Testing Structure

Phase 0 deliverable: "Configure basic testing structure" -> this setup.

## Approach

Two layers, matching what each part of the backend actually needs:

1. **Database / RLS tests (pgTAP)** -- `supabase/tests/*.sql`. These run
   against a real local Postgres via the Supabase CLI and test schema and
   Row Level Security directly: "an anon user can select organisations",
   "a user cannot read another user's availability", etc. This is the
   most important layer for this project, since privacy/safety rules
   (Phase 1-5) live in RLS policies.

   Requires Docker + `supabase start`:
   ```bash
   npx supabase test db
   ```

2. **Edge Function tests** -- once Edge Functions exist (Phase 1+), each
   function gets a colocated test using Deno's built-in test runner
   (Edge Functions run on Deno). Example layout:
   ```
   supabase/functions/create-activity/index.ts
   supabase/functions/create-activity/index.test.ts
   ```
   Run with `npx supabase functions serve` locally + `deno test`, or via
   the function's own test command once added.

## Auth verification tests

`001_auth_verification.sql` covers the Phase 1 foundation that is safe to
exercise without creating real accounts: email normalisation, approved-domain
resolution, the profile schema, Auth triggers and the verified-user helper.
The full signup/confirmation flow must still be smoke-tested against a local
Supabase Auth instance because `auth.users` is managed by Supabase.

## Example pgTAP test (template)

`supabase/tests/001_organisations_rls.sql`:

```sql
begin;
select plan(2);

select has_table('public', 'organisations', 'organisations table exists');

select results_eq(
  $$ select count(*)::int from public.organisations $$,
  $$ values (2) $$,
  'seed data inserts exactly 2 organisations'
);

select * from finish();
rollback;
```

(Not added yet as a real file -- add the first real test alongside the
first migration that needs one, e.g. when `base_rls_policies` policies
are exercised for real in Phase 1.)

## CI

`.github/workflows/ci.yml` runs the frontend lint/build and the complete
local Supabase pgTAP suite (currently 387 checks) on pushes and pull requests. The workflow starts
an isolated Supabase stack on the GitHub runner; it does not connect to or
modify `recess-dev`.

## Remaining test coverage

- No automated browser/E2E suite yet; sign-up confirmation and the
  multi-session realtime map still need the release smoke test.
- No load/performance test framework yet. Matching query performance should
  be measured against representative data before a wider rollout.

## Local testing requires Docker

`supabase start` / `npx supabase test db` need Docker Desktop running
locally. `npx supabase db reset` recreates the local database from migrations
and seed data, so it removes local test accounts and other local-only data.
Use it only when you intend to reset the local stack; it does not reset the
remote project. Teammates without Docker can still write and review
migrations, while CI runs the local database test suite.
