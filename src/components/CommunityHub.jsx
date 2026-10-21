import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban, CalendarPlus, Check, MessageCircle, RefreshCw, Send, ShieldAlert, Trash2,
  Sparkles, UserPlus, X,
} from 'lucide-react';
import {
  addAvailability, blockUser, createOrganisationEvent, deleteAvailability, deleteMessage,
  loadAvailabilityAndInterests, loadConversations, loadHostRequests,
  loadMatchingSuggestions, loadMessages, loadConnections, loadOrganisationAdminContext,
  reportUser, respondToConnection, respondToJoinRequest, sendConnectionRequest,
  sendMessage, setInterestSelected, setOrganisationEventStatus, subscribeToMessages,
} from '../services/community';
import { markConversationRead, subscribeToCommunityChanges } from '../services/notifications';
import NotificationBadge from './NotificationBadge';

const tabs = [
  ['matching', 'Matching'], ['connections', 'Connections'], ['requests', 'Host inbox'],
  ['chat', 'Chat'], ['admin', 'Organisation events'],
];

function ErrorNotice({ error }) {
  return error ? <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">{error}</p> : null;
}

function Panel({ title, icon: Icon, children, action }) {
  return <section className="min-w-0 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-bold text-neutral-900"><Icon size={16} className="text-orange-600" />{title}</h2>{action}</div>
    {children}
  </section>;
}

function MatchingPanel({ onRefresh, onSafety }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null); const [sent, setSent] = useState({});
  const load = async () => { setLoading(true); setError(null); try { setRows(await loadMatchingSuggestions()); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  useEffect(() => { queueMicrotask(() => { void load(); }); }, []);
  return <Panel title="People you may connect with" icon={Sparkles} action={<button type="button" onClick={load} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100" aria-label="Refresh suggestions"><RefreshCw size={14} /></button>}>
    <p className="mb-4 text-xs text-neutral-500">Suggestions use shared interests, compatible availability and approximate areas. Exact locations are never shown.</p>
    <ErrorNotice error={error} />
    {loading ? <p className="text-xs text-neutral-400">Finding compatible people…</p> : rows.length === 0 ? <p className="rounded-xl bg-neutral-50 p-4 text-xs text-neutral-500">No suggestions yet. Add an availability window and interests to improve matching.</p> : <div className="space-y-3">{rows.map((row) => <div key={row.candidate_id} className="rounded-xl border border-neutral-100 p-3">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-neutral-900">{row.profile?.display_name || row.display_name || 'Recess member'}</p><p className="text-[11px] text-neutral-500">{row.profile?.course_or_role || 'Verified community member'} · {row.overlap_minutes} min overlap</p></div><button type="button" disabled={sent[row.candidate_id]} onClick={async () => { try { await sendConnectionRequest(row.candidate_id); setSent((prev) => ({ ...prev, [row.candidate_id]: true })); onRefresh?.(); } catch (err) { setError(err.message); } }} className="flex items-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:bg-green-600">{sent[row.candidate_id] ? <><Check size={12} /> Sent</> : <><UserPlus size={12} /> Connect</>}</button></div>
      <div className="mt-2 flex items-center justify-between">{row.sharedInterests?.length ? <p className="text-[11px] text-orange-700">Shared: {row.sharedInterests.join(', ')}</p> : <span />}<button type="button" onClick={() => onSafety?.(row.candidate_id)} className="text-[11px] text-neutral-400 underline hover:text-neutral-700">Safety</button></div>
    </div>)}</div>}
  </Panel>;
}

function ConnectionsPanel({ onOpenChat, onSafety }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(null);
  const load = useCallback(async () => { try { setRows(await loadConnections()); setError(null); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = setTimeout(load, 0); const unsubscribe = subscribeToCommunityChanges(() => { void load(); }); return () => { clearTimeout(timer); unsubscribe(); }; }, [load]);
  const respond = async (id, status) => { try { await respondToConnection(id, status); await load(); } catch (err) { setError(err.message); } };
  return <Panel title="Connection requests" icon={UserPlus} action={<button type="button" onClick={load} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"><RefreshCw size={14} /></button>}>
    <ErrorNotice error={error} />{loading ? <p className="text-xs text-neutral-400">Loading connections…</p> : rows.length === 0 ? <p className="text-xs text-neutral-500">No connection requests yet.</p> : <div className="space-y-2">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 p-3"><div><p className="text-sm font-semibold">{row.person?.display_name || 'Recess member'}</p><p className="text-[11px] capitalize text-neutral-500">{row.status}{row.incoming ? ' · incoming' : ''}</p></div><div className="flex gap-1.5">{row.incoming && row.status === 'pending' ? <><button type="button" onClick={() => respond(row.id, 'accepted')} className="rounded-lg bg-green-600 p-2 text-white" aria-label="Accept connection"><Check size={13} /></button><button type="button" onClick={() => respond(row.id, 'declined')} className="rounded-lg bg-white p-2 text-neutral-500 ring-1 ring-neutral-200" aria-label="Decline connection"><X size={13} /></button></> : null}{row.status === 'accepted' ? <button type="button" onClick={() => onOpenChat?.(row.person?.id)} className="flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[11px] font-semibold text-white"><MessageCircle size={12} /> Chat</button> : null}<button type="button" onClick={() => onSafety?.(row.person?.id)} className="px-1 text-[11px] text-neutral-400 underline">Safety</button></div></div>)}</div>}
  </Panel>;
}

function HostInboxPanel() {
  const [rows, setRows] = useState([]); const [error, setError] = useState(null); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { setRows(await loadHostRequests()); setError(null); } catch (err) { setError(err.message); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = setTimeout(load, 0); const unsubscribe = subscribeToCommunityChanges(() => { void load(); }); return () => { clearTimeout(timer); unsubscribe(); }; }, [load]);
  const respond = async (id, status) => { try { await respondToJoinRequest(id, status); await load(); } catch (err) { setError(err.message); } };
  return <Panel title="Host inbox" icon={MessageCircle} action={<button type="button" onClick={load} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"><RefreshCw size={14} /></button>}><ErrorNotice error={error} />{loading ? <p className="text-xs text-neutral-400">Loading join requests…</p> : rows.length === 0 ? <p className="text-xs text-neutral-500">No pending join requests for your activities.</p> : <div className="space-y-2">{rows.map((row) => { const displayName = row.profile?.display_name || 'Recess member'; return <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 p-3"><div><p className="text-sm font-semibold">{displayName}</p><p className="text-[11px] text-neutral-500">wants to join <b>{row.activity?.title}</b></p></div><div className="flex gap-1.5"><button type="button" aria-label={`Accept request from ${displayName}`} onClick={() => respond(row.id, 'accepted')} className="rounded-lg bg-green-600 p-2 text-white"><Check size={13} /></button><button type="button" aria-label={`Decline request from ${displayName}`} onClick={() => respond(row.id, 'declined')} className="rounded-lg border border-neutral-200 bg-white p-2 text-neutral-500"><X size={13} /></button></div></div>; })}</div>}</Panel>;
}

export function PreferencesPanel() {
  const [data, setData] = useState({ availabilities: [], interests: [], selectedInterestIds: [], areas: [] }); const [form, setForm] = useState({ areaId: '', startTime: '', endTime: '' }); const [error, setError] = useState(null); const [saving, setSaving] = useState(false);
  const load = async () => { try { setData(await loadAvailabilityAndInterests()); } catch (err) { setError(err.message); } }; useEffect(() => { queueMicrotask(() => { void load(); }); }, []);
  const add = async (event) => { event.preventDefault(); setSaving(true); setError(null); try { await addAvailability({ areaId: form.areaId, startTime: new Date(form.startTime).toISOString(), endTime: new Date(form.endTime).toISOString() }); setForm({ areaId: '', startTime: '', endTime: '' }); await load(); } catch (err) { setError(err.message); } finally { setSaving(false); } };
  const field = 'min-w-0 w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs';
  return <div className="min-w-0 space-y-4">
    <Panel title="Availability" icon={CalendarPlus}>
      <form onSubmit={add} className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-4">
        <select aria-label="Availability area" required value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })} className={field}><option value="">Choose an area</option>{data.areas.map((area) => <option key={area.id} value={area.id}>{area.name} · {area.locations?.name}</option>)}</select>
        <input aria-label="Availability starts" required type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={field} />
        <input aria-label="Availability ends" required type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={field} />
        <button disabled={saving} className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Add availability'}</button>
      </form>
      <ErrorNotice error={error} />
      <div className="mt-3 space-y-1">{data.availabilities.map((availability) => <div key={availability.id} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs"><span className="min-w-0 break-words">{availability.areas?.name} · {new Date(availability.start_time).toLocaleString()}–{new Date(availability.end_time).toLocaleTimeString()}</span><button type="button" aria-label="Remove availability" onClick={async () => { try { await deleteAvailability(availability.id); await load(); } catch (err) { setError(err.message); } }} className="shrink-0 text-neutral-400 hover:text-red-600"><X size={13} /></button></div>)}</div>
    </Panel>
    <Panel title="Interests" icon={Sparkles}><p className="mb-3 text-xs text-neutral-500">Choose interests used by matching suggestions.</p><div className="flex flex-wrap gap-2">{data.interests.map((interest) => { const selected = data.selectedInterestIds.includes(interest.id); return <button type="button" key={interest.id} aria-pressed={selected} onClick={async () => { try { await setInterestSelected(interest.id, !selected); setData((prev) => ({ ...prev, selectedInterestIds: selected ? prev.selectedInterestIds.filter((id) => id !== interest.id) : [...prev.selectedInterestIds, interest.id] })); } catch (err) { setError(err.message); } }} className={`rounded-full px-3 py-1.5 text-xs ${selected ? 'bg-orange-600 text-white' : 'bg-neutral-100 text-neutral-700'}`}>{interest.name}</button>; })}</div></Panel>
  </div>;
}

// A keyed thread keeps in-flight sends/loads from showing one chat's messages
// or draft in a different conversation when the user switches quickly.
function ChatThread({ conversation, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    let request = 0;
    const refresh = async () => {
      const currentRequest = ++request;
      try {
        const rows = await loadMessages(conversation.id);
        if (!active || request !== currentRequest) return;
        setMessages(rows); setError(null);
        if (document.visibilityState === 'visible' && rows.length) await markConversationRead(conversation.id, rows.at(-1).id);
      } catch (err) { if (active && request === currentRequest) setError(err.message); }
    };
    const timer = setTimeout(() => { void refresh(); }, 0);
    const unsubscribe = subscribeToMessages(conversation.id, () => { void refresh(); });
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('focus', visible);
    return () => { active = false; clearTimeout(timer); unsubscribe(); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); };
  }, [conversation.id, revision]);
  const send = async (event) => {
    event.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true); setError(null);
    try { await sendMessage(conversation.id, body); setBody(''); setRevision((previous) => previous + 1); }
    catch (err) { setError(err.message); }
    finally { setSending(false); }
  };
  const remove = async (messageId) => {
    try { await deleteMessage(messageId); setRevision((previous) => previous + 1); }
    catch (err) { setError(err.message); }
  };
  return <><div className="mb-2 border-b border-neutral-200 pb-2 text-xs font-semibold">{conversation.title}</div><ErrorNotice error={error} /><div className="max-h-96 flex-1 space-y-2 overflow-y-auto">{messages.map((message) => <div key={message.id} className="flex items-start justify-between gap-2 rounded-lg bg-white p-2 text-xs"><span className="min-w-0 break-words [overflow-wrap:anywhere]"><span className="font-semibold">{message.author}: </span>{message.deleted_at ? <i className="text-neutral-400">Message deleted</i> : message.body}</span>{currentUserId === message.sender_id && !message.deleted_at ? <button type="button" onClick={() => remove(message.id)} aria-label="Delete message" className="shrink-0 text-neutral-300 hover:text-red-500"><Trash2 size={12} /></button> : null}</div>)}</div><form onSubmit={send} className="mt-2 flex gap-2"><input value={body} disabled={sending} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="Write a message…" className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-xs" /><button disabled={sending || !body.trim()} className="rounded-lg bg-orange-600 p-2 text-white disabled:opacity-50" aria-label="Send message"><Send size={13} /></button></form></>;
}

function ChatPanel({ initialPersonId, initialActivityId, currentUserId, unreadCounts = {} }) {
  const [conversations, setConversations] = useState([]); const [selected, setSelected] = useState(null); const [error, setError] = useState(null);
  const loadConvos = useCallback(async () => {
    try {
      const loaded = await loadConversations();
      setConversations(loaded);
      setSelected((previous) => {
        if (previous) return loaded.find((conversation) => conversation.id === previous.id) ?? null;
        if (initialPersonId) return loaded.find((conversation) => conversation.peerId === initialPersonId) ?? null;
        if (initialActivityId) return loaded.find((conversation) => conversation.activity_id === initialActivityId) ?? null;
        return null;
      });
    } catch (err) { setError(err.message); }
  }, [initialActivityId, initialPersonId]);
  useEffect(() => { const timer = setTimeout(loadConvos, 0); const unsubscribe = subscribeToCommunityChanges(() => { void loadConvos(); }); return () => { clearTimeout(timer); unsubscribe(); }; }, [loadConvos]);
  return <Panel title="Chat" icon={MessageCircle}><ErrorNotice error={error} /><div className="grid min-w-0 gap-3 md:grid-cols-[220px_minmax(0,1fr)]"><div className="min-w-0 space-y-1">{conversations.length === 0 ? <p className="text-xs text-neutral-500">Accept a connection or join an activity to open a chat.</p> : conversations.map((conversation) => <button type="button" key={conversation.id} onClick={() => setSelected(conversation)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs ${selected?.id === conversation.id ? 'bg-orange-100 text-orange-800' : 'bg-neutral-50 text-neutral-700'}`}><span className="min-w-0 break-words">{conversation.title}</span><NotificationBadge count={unreadCounts[conversation.id]} label="unread messages" /></button>)}</div><div className="flex min-h-56 min-w-0 flex-col rounded-xl border border-neutral-100 bg-neutral-50 p-3">{selected ? <ChatThread key={selected.id} conversation={selected} currentUserId={currentUserId} /> : <p className="m-auto text-xs text-neutral-400">Select a conversation.</p>}</div></div></Panel>;
}

export function ModerationPanel({ targetUserId = '' }) {
  const [userId, setUserId] = useState(targetUserId); const [reason, setReason] = useState('harassment'); const [details, setDetails] = useState(''); const [message, setMessage] = useState(null); const [error, setError] = useState(null);
  const submit = async (event) => { event.preventDefault(); setMessage(null); setError(null); try { await blockUser(userId); setMessage('User blocked.'); } catch (err) { setError(err.message); } };
  const report = async () => { if (reason === 'other' && !details.trim()) { setError('Add details when choosing Other.'); return; } try { await reportUser({ reportedUserId: userId, reason, details }); setMessage('Report submitted to moderation.'); } catch (err) { setError(err.message); } };
  return <Panel title="Safety tools" icon={ShieldAlert}><p className="mb-3 text-xs text-neutral-500">Use a profile ID from a profile or message when you need to block or report someone. Blocks hide their activity, matching and chat content.</p><input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" className="mb-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs" /><div className="flex flex-wrap gap-2"><button type="button" onClick={submit} disabled={!userId} className="flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Ban size={13} /> Block</button><select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-neutral-200 px-2 text-xs"><option value="harassment">Harassment</option><option value="spam">Spam</option><option value="inappropriate_content">Inappropriate content</option><option value="unsafe_behaviour">Unsafe behaviour</option><option value="impersonation">Impersonation</option><option value="other">Other</option></select><button type="button" onClick={report} disabled={!userId} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-40"><ShieldAlert size={13} /> Report</button></div><textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Report details (optional)" maxLength={1000} className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs" />{message && <p className="mt-2 text-xs text-green-700">{message}</p>}<ErrorNotice error={error} /></Panel>;
}

function AdminPanel() {
  const [context, setContext] = useState(null); const [form, setForm] = useState({ title: '', description: '', locationId: '', areaId: '', startTime: '', endTime: '', participantLimit: '' }); const [error, setError] = useState(null); const [saving, setSaving] = useState(false);
  const load = async () => { try { setContext(await loadOrganisationAdminContext()); } catch (err) { setError(err.message); } }; useEffect(() => { queueMicrotask(() => { void load(); }); }, []);
  const locations = useMemo(() => { const byId = new Map(); (context?.areas ?? []).forEach((area) => { if (area.locations) byId.set(area.locations.id, area.locations); }); return [...byId.values()]; }, [context]);
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(null); try { await createOrganisationEvent({ organisation_id: context.profile.organisation_id, creator_id: context.profile.id, title: form.title, description: form.description, location_id: form.locationId, area_id: form.areaId || null, participant_limit: form.participantLimit ? Number(form.participantLimit) : null, start_time: new Date(form.startTime).toISOString(), end_time: new Date(form.endTime).toISOString(), status: 'draft' }); setForm({ title: '', description: '', locationId: '', areaId: '', startTime: '', endTime: '', participantLimit: '' }); await load(); } catch (err) { setError(err.message); } finally { setSaving(false); } };
  if (!context?.profile?.is_org_admin) return <Panel title="Organisation events" icon={CalendarPlus}><p className="text-xs text-neutral-500">This area is available to approved organisation admins. Your account is not currently marked as an organisation admin.</p><ErrorNotice error={error} /></Panel>;
  return <div className="space-y-4"><Panel title={`Manage ${context.profile.organisations?.name || 'organisation'} events`} icon={CalendarPlus}><form onSubmit={submit} className="grid gap-2 md:grid-cols-2"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" className="rounded-lg border border-neutral-200 px-3 py-2 text-xs" /><select required value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"><option value="">Venue</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><select value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"><option value="">Area (optional)</option>{context.areas.filter((area) => !form.locationId || area.location_id === form.locationId).map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select><input type="number" min="1" max="10000" step="1" value={form.participantLimit} onChange={(e) => setForm({ ...form, participantLimit: e.target.value })} placeholder="Attendee limit (optional)" aria-label="Attendee limit (optional)" className="rounded-lg border border-neutral-200 px-3 py-2 text-xs" /><textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="rounded-lg border border-neutral-200 px-3 py-2 text-xs" /><input required type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs" /><input required type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs" /><button disabled={saving} className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 md:col-span-2">{saving ? 'Saving…' : 'Create draft event'}</button></form><p className="mt-2 text-[11px] text-neutral-500">Leave attendee limit blank for an unlimited event. A waitlisted attendee is promoted automatically when a place opens.</p><ErrorNotice error={error} /></Panel><Panel title="Approval queue" icon={ShieldAlert}><div className="space-y-2">{context.events.length === 0 ? <p className="text-xs text-neutral-500">No organisation events yet.</p> : context.events.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 p-3"><div><p className="text-xs font-semibold">{event.title}</p><p className="text-[11px] capitalize text-neutral-500">{event.status} · {new Date(event.start_time).toLocaleString()}{event.participant_limit ? ` · limit ${event.participant_limit}` : ''}</p></div><div className="flex gap-2">{event.status === 'draft' ? <button type="button" onClick={async () => { await setOrganisationEventStatus(event.id, 'approved'); await load(); }} className="rounded-lg bg-green-600 px-2.5 py-1.5 text-[11px] font-semibold text-white">Approve</button> : null}{event.status === 'approved' ? <button type="button" onClick={async () => { await setOrganisationEventStatus(event.id, 'cancelled'); await load(); }} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-700">Cancel</button> : null}</div></div>)}</div></Panel></div>;
}

export default function CommunityHub({ initialTab = 'matching', currentUserId, initialActivityId = null, notifications = {}, onOpenSafety }) {
  const [tab, setTab] = useState(initialTab); const [chatTargetId, setChatTargetId] = useState(null);
  const openSafety = (userId) => { onOpenSafety?.(userId || ''); };
  const openChat = (personId) => { setChatTargetId(personId); setTab('chat'); };
  return <div className="mx-auto max-w-5xl space-y-4 p-2 sm:p-6"><div className="flex gap-1 overflow-x-auto rounded-2xl border border-neutral-100 bg-white p-1.5 shadow-sm">{tabs.map(([value, label]) => <button type="button" key={value} onClick={() => { setChatTargetId(null); setTab(value); }} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold ${tab === value ? 'bg-orange-600 text-white' : 'text-neutral-600 hover:bg-neutral-50'}`}>{label}<NotificationBadge count={value === 'chat' ? notifications.messages : value === 'connections' ? notifications.connections : value === 'requests' ? notifications.requests : 0} label={value === 'chat' ? 'unread messages' : 'pending requests'} /></button>)}</div>{tab === 'matching' ? <MatchingPanel onSafety={openSafety} /> : null}{tab === 'connections' ? <ConnectionsPanel onSafety={openSafety} onOpenChat={openChat} /> : null}{tab === 'requests' ? <HostInboxPanel /> : null}{tab === 'chat' ? <ChatPanel currentUserId={currentUserId} initialActivityId={initialActivityId} initialPersonId={chatTargetId} unreadCounts={notifications.byConversation} /> : null}{tab === 'admin' ? <AdminPanel /> : null}</div>;
}
