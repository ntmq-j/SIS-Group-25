-- Phase 6 security hardening: trigger and Auth-hook functions are not API
-- endpoints. Revoke their default EXECUTE privilege so anon/authenticated
-- clients cannot invoke them through /rest/v1/rpc. PostgreSQL triggers and
-- Auth hooks continue to run because they execute through their owning table
-- or Auth trigger context.

alter function public.email_domain(text) set search_path = public;
revoke all on function public.email_domain(text) from public, anon, authenticated;

revoke all on function public.check_event_rsvp_allowed() from public, anon, authenticated;
revoke all on function public.check_official_event_not_expired_on_create() from public, anon, authenticated;
revoke all on function public.create_activity_conversation() from public, anon, authenticated;
revoke all on function public.create_private_conversation() from public, anon, authenticated;
revoke all on function public.default_official_event_coordinates() from public, anon, authenticated;
revoke all on function public.enforce_area_belongs_to_location() from public, anon, authenticated;
revoke all on function public.guard_activity_participant_write() from public, anon, authenticated;
revoke all on function public.guard_activity_write() from public, anon, authenticated;
revoke all on function public.guard_block_write() from public, anon, authenticated;
revoke all on function public.guard_connection_write() from public, anon, authenticated;
revoke all on function public.guard_message_write() from public, anon, authenticated;
revoke all on function public.guard_report_write() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.insert_creator_as_participant() from public, anon, authenticated;
revoke all on function public.prevent_profile_protected_changes() from public, anon, authenticated;
revoke all on function public.protect_official_event_changes() from public, anon, authenticated;
revoke all on function public.set_availability_updated_at() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.sync_auth_user_state() from public, anon, authenticated;
revoke all on function public.validate_auth_user_email() from public, anon, authenticated;

comment on function public.email_domain(text) is
  'Normalises and validates the domain portion of an email address. API access is intentionally disabled.';
