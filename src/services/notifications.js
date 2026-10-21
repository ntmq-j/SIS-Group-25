import { supabase } from '../lib/supabaseClient';
import { loadHostRequests } from './community';

export const EMPTY_NOTIFICATIONS = { messages: 0, connections: 0, requests: 0, byConversation: {} };

export async function loadNotifications(userId) {
  const [unread, connections, requests] = await Promise.all([
    supabase.rpc('conversation_unread_counts'),
    supabase.from('connections').select('id', { count: 'exact', head: true })
      .eq('addressee_id', userId).eq('status', 'pending'),
    loadHostRequests(),
  ]);
  if (unread.error) throw unread.error;
  if (connections.error) throw connections.error;
  const byConversation = Object.fromEntries((unread.data ?? []).map((row) => [row.conversation_id, Number(row.unread_count)]));
  return {
    messages: Object.values(byConversation).reduce((sum, count) => sum + count, 0),
    connections: connections.count ?? 0,
    requests: requests.length,
    byConversation,
  };
}

export async function markConversationRead(conversationId, messageId) {
  if (!messageId) return;
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId, p_message_id: messageId,
  });
  if (error) throw error;
  window.dispatchEvent(new Event('recess:notifications'));
}

export function subscribeToCommunityChanges(onChange) {
  const channel = supabase.channel(`recess-community-${crypto.randomUUID()}`);
  for (const table of ['messages', 'conversations', 'connections', 'activity_participants', 'activities', 'blocks', 'conversation_reads']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
  }
  channel.subscribe((status) => { if (status === 'SUBSCRIBED') onChange(); });
  return () => { void supabase.removeChannel(channel); };
}
