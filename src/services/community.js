import { supabase } from '../lib/supabaseClient';
import { createOfficialEvent, loadAreas } from './events';

async function currentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Sign in to use this feature.');
  return user;
}

export async function loadStatusPosts() {
  const { data, error } = await supabase
    .from('status_posts')
    .select('id, body, created_at, user_id, profiles!status_posts_user_id_fkey(display_name)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((post) => ({
    id: post.id,
    type: 'status',
    text: post.body,
    author: post.profiles?.display_name || 'Recess member',
    userId: post.user_id,
    time: post.created_at,
    createdAt: post.created_at,
  }));
}

export async function createStatusPost(body) {
  const user = await currentUser();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;
  if (!profile?.organisation_id) throw new Error('Your verified organisation is not available.');
  const { error } = await supabase.from('status_posts').insert({
    user_id: user.id,
    organisation_id: profile.organisation_id,
    body: body.trim(),
  });
  if (error) throw error;
}

export function subscribeToStatusPosts(onChange) {
  const channel = supabase.channel('recess-status-posts')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'status_posts' }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function loadAvailabilityAndInterests() {
  const user = await currentUser();
  const [{ data: availabilities, error: availabilityError }, { data: selected, error: selectedError }, { data: interests, error: interestsError }, areas] = await Promise.all([
    supabase.from('availabilities')
      .select('id, area_id, start_time, end_time, areas(name, locations(name))')
      .eq('user_id', user.id)
      .gt('end_time', new Date().toISOString())
      .order('start_time'),
    supabase.from('profile_interests').select('interest_id').eq('profile_id', user.id),
    supabase.from('interests').select('id, name').order('name'),
    loadAreas(),
  ]);
  if (availabilityError) throw availabilityError;
  if (selectedError) throw selectedError;
  if (interestsError) throw interestsError;
  return { availabilities: availabilities ?? [], selectedInterestIds: (selected ?? []).map((row) => row.interest_id), interests: interests ?? [], areas };
}

export async function addAvailability({ areaId, startTime, endTime }) {
  const user = await currentUser();
  const { data, error } = await supabase.from('availabilities')
    .insert({ user_id: user.id, area_id: areaId, start_time: startTime, end_time: endTime })
    .select('id, area_id, start_time, end_time, areas(name, locations(name))')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAvailability(id) {
  const { error } = await supabase.from('availabilities').delete().eq('id', id);
  if (error) throw error;
}

export async function setInterestSelected(interestId, selected) {
  const user = await currentUser();
  if (selected) {
    const { error } = await supabase.from('profile_interests').insert({ profile_id: user.id, interest_id: interestId });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase.from('profile_interests').delete().eq('profile_id', user.id).eq('interest_id', interestId);
    if (error) throw error;
  }
}

export async function loadMatchingSuggestions() {
  let { data, error } = await supabase.functions.invoke('refresh-suggestions', { body: {} });
  if (error && (error.context?.status === 404 || /not found|failed to fetch/i.test(error.message ?? ''))) {
    const fallback = await supabase.rpc('matching_suggestions');
    data = fallback.data;
    error = fallback.error;
  } else if (!error) data = data?.data ?? data;
  if (error) throw error;
  const suggestions = data ?? [];
  if (!suggestions.length) return [];
  const ids = suggestions.map((suggestion) => suggestion.candidate_id);
  const [{ data: profiles, error: profileError }, { data: interests, error: interestError }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, bio, course_or_role, account_type').in('id', ids),
    supabase.from('interests').select('id, name').in('id', [...new Set(suggestions.flatMap((row) => row.shared_interest_ids ?? []))]),
  ]);
  if (profileError) throw profileError;
  if (interestError) throw interestError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const interestById = new Map((interests ?? []).map((interest) => [interest.id, interest.name]));
  return suggestions.map((suggestion) => ({
    ...suggestion,
    profile: profileById.get(suggestion.candidate_id),
    sharedInterests: (suggestion.shared_interest_ids ?? []).map((id) => interestById.get(id)).filter(Boolean),
  }));
}

export async function loadConnections() {
  const user = await currentUser();
  const { data, error } = await supabase.from('connections')
    .select('id, requester_id, addressee_id, status, created_at, responded_at')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const ids = [...new Set(rows.map((row) => row.requester_id === user.id ? row.addressee_id : row.requester_id))];
  const { data: profiles, error: profileError } = ids.length
    ? await supabase.from('profiles').select('id, display_name, bio, course_or_role').in('id', ids)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return rows.map((row) => ({
    ...row,
    incoming: row.addressee_id === user.id && row.status === 'pending',
    outgoing: row.requester_id === user.id && row.status === 'pending',
    person: byId.get(row.requester_id === user.id ? row.addressee_id : row.requester_id),
  }));
}

export async function sendConnectionRequest(addresseeId) {
  const user = await currentUser();
  const { error } = await supabase.from('connections').insert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' });
  if (error) throw error;
}

export async function respondToConnection(connectionId, status) {
  const { error } = await supabase.from('connections').update({ status }).eq('id', connectionId);
  if (error) throw error;
}

export async function loadHostRequests() {
  const user = await currentUser();
  const { data: activities, error: activityError } = await supabase.from('activities')
    .select('id, title, start_time, location_label')
    .eq('creator_id', user.id).eq('status', 'open').order('start_time');
  if (activityError) throw activityError;
  const ids = (activities ?? []).map((activity) => activity.id);
  if (!ids.length) return [];
  const { data: requests, error } = await supabase.from('activity_participants')
    .select('id, activity_id, user_id, created_at, status')
    .in('activity_id', ids).eq('status', 'pending').order('created_at');
  if (error) throw error;
  const userIds = [...new Set((requests ?? []).map((request) => request.user_id))];
  const { data: profiles, error: profileError } = userIds.length
    ? await supabase.from('profiles').select('id, display_name, bio, course_or_role').in('id', userIds)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const activityById = new Map((activities ?? []).map((activity) => [activity.id, activity]));
  return (requests ?? []).map((request) => ({ ...request, profile: profileById.get(request.user_id), activity: activityById.get(request.activity_id) }));
}

export async function respondToJoinRequest(participantId, status) {
  const { error } = await supabase.from('activity_participants').update({ status }).eq('id', participantId);
  if (error) throw error;
}

export async function loadConversations() {
  const user = await currentUser();
  const { data, error } = await supabase.from('conversations')
    .select('id, kind, user_a, user_b, activity_id, created_at').order('created_at', { ascending: false });
  if (error) throw error;
  const conversations = data ?? [];
  const profileIds = [...new Set(conversations.flatMap((conversation) => conversation.kind === 'private'
    ? [conversation.user_a === user.id ? conversation.user_b : conversation.user_a]
    : []))];
  const activityIds = conversations.filter((conversation) => conversation.activity_id).map((conversation) => conversation.activity_id);
  const [{ data: profiles, error: profilesError }, { data: activities, error: activitiesError }] = await Promise.all([
    profileIds.length ? supabase.from('profiles').select('id, display_name').in('id', profileIds) : Promise.resolve({ data: [], error: null }),
    activityIds.length ? supabase.from('activities').select('id, title').in('id', activityIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesError) throw profilesError;
  if (activitiesError) throw activitiesError;
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const activityById = new Map((activities ?? []).map((activity) => [activity.id, activity]));
  return conversations.map((conversation) => ({
    ...conversation,
    peerId: conversation.kind === 'private'
      ? (conversation.user_a === user.id ? conversation.user_b : conversation.user_a)
      : null,
    title: conversation.kind === 'private'
      ? profileById.get(conversation.user_a === user.id ? conversation.user_b : conversation.user_a)?.display_name ?? 'Connection'
      : activityById.get(conversation.activity_id)?.title ?? 'Activity chat',
  }));
}

export async function loadMessages(conversationId) {
  const { data, error } = await supabase.from('messages')
    .select('id, conversation_id, sender_id, body, created_at, deleted_at')
    .eq('conversation_id', conversationId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(200);
  if (error) throw error;
  const rows = (data ?? []).reverse();
  const ids = [...new Set(rows.map((row) => row.sender_id))];
  const { data: profiles, error: profileError } = ids.length
    ? await supabase.from('profiles').select('id, display_name').in('id', ids)
    : { data: [], error: null };
  if (profileError) throw profileError;
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  return rows.map((row) => ({ ...row, author: byId.get(row.sender_id) ?? 'Recess member' }));
}

export async function sendMessage(conversationId, body) {
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, body: body.trim() });
  if (error) throw error;
}

export async function deleteMessage(messageId) {
  const { data, error } = await supabase.from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
    .select('id, conversation_id, sender_id, body, created_at, deleted_at')
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToMessages(conversationId, onChange) {
  const channel = supabase.channel(`recess-messages-${conversationId}-${crypto.randomUUID()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, onChange)
    .subscribe((status) => { if (status === 'SUBSCRIBED') onChange(); });
  return () => { void supabase.removeChannel(channel); };
}

export async function blockUser(blockedId) {
  const user = await currentUser();
  const { error } = await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error && error.code !== '23505') throw error;
}

export async function reportUser({ reportedUserId, reason, details, messageId, activityId }) {
  const { error } = await supabase.from('reports').insert({
    reported_user_id: reportedUserId,
    reason,
    details: details?.trim() || null,
    message_id: messageId || null,
    activity_id: activityId || null,
  });
  if (error) throw error;
}

export async function loadOrganisationAdminContext() {
  const user = await currentUser();
  const { data: profile, error } = await supabase.from('profiles')
    .select('organisation_id, is_org_admin, organisations(name)')
    .eq('id', user.id).single();
  if (error) throw error;
  if (!profile.is_org_admin) return { profile, events: [], areas: [] };
  const [{ data: events, error: eventsError }, areas] = await Promise.all([
    supabase.from('official_events')
      .select('id, title, description, location_id, area_id, latitude, longitude, participant_limit, start_time, end_time, status, locations(name), areas(name)')
      .eq('organisation_id', profile.organisation_id).order('start_time', { ascending: false }),
    loadAreas(),
  ]);
  if (eventsError) throw eventsError;
  return { profile, events: events ?? [], areas };
}

export async function createOrganisationEvent(payload) {
  return createOfficialEvent(payload);
}

export async function setOrganisationEventStatus(eventId, status) {
  const { data, error } = await supabase.from('official_events').update({ status })
    .eq('id', eventId).select('id, status').single();
  if (error) throw error;
  return data;
}
