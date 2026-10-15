import { supabase } from '../lib/supabaseClient';

const profileFields = 'id, display_name, bio, course_or_role, account_type, account_status, email_verified_at, organisation_id, organisations(name, type)';

export async function loadOwnProfile() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Authentication required');

  const { data, error } = await supabase
    .from('profiles')
    .select(profileFields)
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return { user, profile: data };
}

export async function updateOwnProfile(patch) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Authentication required');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: patch.display_name?.trim() || null,
      bio: patch.bio?.trim() || null,
      course_or_role: patch.course_or_role?.trim() || null,
    })
    .eq('id', user.id)
    .select(profileFields)
    .single();
  if (error) throw error;
  return data;
}
