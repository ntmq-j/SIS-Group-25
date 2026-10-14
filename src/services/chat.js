import { supabase } from '../lib/supabaseClient';

export function formatChatError(error) {
  const message = String(error?.message ?? error ?? '');
  if (message.includes('[not_connected]')) return "You're no longer connected with this person.";
  if (message.includes('[forbidden]')) return "You can't send messages in this conversation.";
  if (message.includes('[expired]')) return 'This activity has ended. The chat is read-only now.';
  if (message.includes('[activity_cancelled]')) return 'This activity has been cancelled.';
  if (message.includes('[rate_limited]')) return "You're sending messages too quickly. Wait a moment and try again.";
  return message || 'Unable to send that message.';
}

export async function loadConversations(currentUserId) {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, kind, user_a, user_b, activity_id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = conversations ?? [];
  const userIds = [...new Set(rows.flatMap((row) => (
    row.kind === 'private' ? [row.user_a, row.user_b] : []
  )).filter(Boolean))];
  const activityIds = rows.map((row) => row.activity_id).filter(Boolean);

  const [{ data: profiles }, { data: activities }, { data: recentMessages }] = await Promise.all([
    userIds.length
      ? supabase.from('profiles').select('id, display_name').in('id', userIds)
      : Promise.resolve({ data: [] }),
    activityIds.length
      ? supabase.from('activities').select('id, title').in('id', activityIds)
      : Promise.resolve({ data: [] }),
    rows.length
      ? supabase
        .from('messages')
        .select('id, conversation_id, body, created_at, deleted_at, sender_id')
        .in('conversation_id', rows.map((row) => row.id))
        .order('created_at', { ascending: false })
        .limit(200)
      : Promise.resolve({ data: [] }),
  ]);

  const profileById = Object.fromEntries((profiles ?? []).map((profile) => [profile.id, profile]));
  const activityById = Object.fromEntries((activities ?? []).map((activity) => [activity.id, activity]));
  const previewByConversation = {};
  for (const message of recentMessages ?? []) {
    if (!previewByConversation[message.conversation_id]) {
      previewByConversation[message.conversation_id] = message;
    }
  }

  return rows.map((row) => {
    const otherUserId = row.kind === 'private'
      ? (row.user_a === currentUserId ? row.user_b : row.user_a)
      : null;
    const otherUser = otherUserId ? profileById[otherUserId] : null;
    const activity = row.activity_id ? activityById[row.activity_id] : null;
    return {
      ...row,
      title: row.kind === 'activity'
        ? (activity?.title || 'Activity chat')
        : (otherUser?.display_name || 'Recess user'),
      subtitle: row.kind === 'activity' ? 'Group chat' : 'Direct message',
      preview: previewByConversation[row.id] ?? null,
    };
  });
}

export async function loadMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at, deleted_at')
    .eq('conversation_id', conversationId)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(conversationId, body) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, body })
    .select('id, sender_id, body, created_at, deleted_at')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMessage(messageId) {
  const { data, error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
    .select('id, sender_id, body, created_at, deleted_at')
    .single();
  if (error) throw error;
  return data;
}

export async function findActivityConversation(activityId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, kind, activity_id')
    .eq('kind', 'activity')
    .eq('activity_id', activityId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadSenderProfiles(senderIds) {
  const ids = [...new Set(senderIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', ids);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((profile) => [profile.id, profile.display_name]));
}

export function subscribeToMessages(conversationId, onChange) {
  const channel = supabase
    .channel(`conversation-${conversationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      onChange,
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function subscribeToConversations(onChange) {
  const channel = supabase
    .channel('conversations-list')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations' },
      onChange,
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
