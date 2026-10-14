import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import Avatar from './Avatar';
import { initials } from '../utils/helpers';
import {
  deleteMessage,
  formatChatError,
  loadConversations,
  loadMessages,
  loadSenderProfiles,
  sendMessage,
  subscribeToConversations,
  subscribeToMessages,
} from '../services/chat';

const MAX_BODY = 2000;

function formatStamp(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function previewText(message) {
  if (!message) return 'No messages yet';
  if (message.deleted_at) return 'Message deleted';
  return message.body;
}

export default function Chat({ currentUserId, initialConversationId = null }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(initialConversationId);
  const activeId = selectedId ?? conversations[0]?.id ?? null;
  const [messages, setMessages] = useState([]);
  const [names, setNames] = useState({});
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [readOnlyReason, setReadOnlyReason] = useState(null);
  const bottomRef = useRef(null);

  const selected = conversations.find((conversation) => conversation.id === activeId) ?? null;

  const refreshList = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const next = await loadConversations(currentUserId);
      setConversations(next);
      setError(null);
    } catch (loadError) {
      setError(loadError?.message ?? 'Unable to load conversations.');
    } finally {
      setLoadingList(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void refreshList();
    const unsubscribe = subscribeToConversations(() => { void refreshList(); });
    return unsubscribe;
  }, [refreshList]);

  useEffect(() => {
    if (!activeId) return undefined;

    let active = true;
    setLoadingThread(true);
    setReadOnlyReason(null);

    loadMessages(activeId)
      .then(async (rows) => {
        if (!active) return;
        setMessages(rows);
        const senderNames = await loadSenderProfiles(rows.map((row) => row.sender_id));
        if (active) setNames(senderNames);
      })
      .catch((loadError) => {
        if (active) setError(loadError?.message ?? 'Unable to load messages.');
      })
      .finally(() => {
        if (active) setLoadingThread(false);
      });

    const unsubscribe = subscribeToMessages(activeId, (payload) => {
      const next = payload.new;
      if (!next?.id) return;
      setMessages((previous) => {
        const exists = previous.some((message) => message.id === next.id);
        if (payload.eventType === 'UPDATE' || exists) {
          return previous.map((message) => (message.id === next.id ? { ...message, ...next } : message));
        }
        return [...previous, next];
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedId]);

  const handleSend = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendMessage(activeId, body);
      setMessages((previous) => (
        previous.some((message) => message.id === sent.id) ? previous : [...previous, sent]
      ));
      setDraft('');
      setReadOnlyReason(null);
      void refreshList();
    } catch (sendError) {
      const friendly = formatChatError(sendError);
      setError(friendly);
      if (
        friendly.includes('read-only')
        || friendly.includes('cancelled')
        || friendly.includes('no longer connected')
      ) {
        setReadOnlyReason(friendly);
      }
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId) => {
    try {
      const updated = await deleteMessage(messageId);
      setMessages((previous) => previous.map((message) => (
        message.id === updated.id ? updated : message
      )));
    } catch (deleteError) {
      setError(formatChatError(deleteError));
    }
  };

  return (
    <div className="grid overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm md:grid-cols-[280px_minmax(0,1fr)] md:min-h-[560px]">
      <aside className="border-b border-neutral-100 md:border-b-0 md:border-r">
        <div className="border-b border-neutral-100 px-4 py-4">
          <h1 className="text-sm font-bold text-neutral-950">Messages</h1>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            Direct chats and activity groups
          </p>
        </div>
        {loadingList ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">Loading conversations…</p>
        ) : conversations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <MessageCircle size={28} className="mx-auto mb-2 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-700">No chats yet</p>
            <p className="mt-1 text-xs text-neutral-400">
              Connect with someone or join an event to open a conversation.
            </p>
          </div>
        ) : (
          <ul className="max-h-56 overflow-y-auto md:max-h-[500px]">
            {conversations.map((conversation) => {
              const active = conversation.id === activeId;
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                      active ? 'bg-orange-50' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <Avatar name={conversation.title} variant={conversation.kind === 'activity' ? 'pro' : 'neutral'} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-neutral-900">{conversation.title}</span>
                        <span className="shrink-0 text-[10px] text-neutral-400">
                          {formatStamp(conversation.preview?.created_at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wider text-orange-600">
                        {conversation.subtitle}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-neutral-400">
                        {previewText(conversation.preview)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className="flex min-h-[420px] flex-col">
        {selected ? (
          <>
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
              <Avatar name={selected.title} variant={selected.kind === 'activity' ? 'pro' : 'neutral'} />
              <div>
                <p className="text-sm font-bold text-neutral-950">{selected.title}</p>
                <p className="text-[11px] text-neutral-400">{selected.subtitle}</p>
              </div>
            </div>

            {error && (
              <p role="alert" className="mx-4 mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {loadingThread ? (
                <p className="py-16 text-center text-sm text-neutral-400">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="py-16 text-center text-sm text-neutral-400">
                  Say hello — this is the start of the conversation.
                </p>
              ) : messages.map((message) => {
                const mine = message.sender_id === currentUserId;
                const senderName = names[message.sender_id] || (mine ? 'You' : 'Recess user');
                const deleted = Boolean(message.deleted_at);
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!mine && (
                        <span className="mb-1 ml-1 text-[10px] font-semibold text-neutral-400">
                          {senderName}
                        </span>
                      )}
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                          deleted
                            ? 'bg-neutral-100 italic text-neutral-400'
                            : mine
                              ? 'bg-orange-600 text-white'
                              : 'bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        {deleted ? 'Message deleted' : message.body}
                      </div>
                      <div className={`mt-1 flex items-center gap-2 ${mine ? 'justify-end' : ''}`}>
                        <span className="text-[10px] text-neutral-400">{formatStamp(message.created_at)}</span>
                        {mine && !deleted && (
                          <button
                            type="button"
                            onClick={() => handleDelete(message.id)}
                            className="text-neutral-300 hover:text-red-500"
                            aria-label="Delete message"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} className="border-t border-neutral-100 p-3">
              {readOnlyReason ? (
                <p className="rounded-xl bg-neutral-50 px-3 py-2 text-center text-xs text-neutral-500">
                  {readOnlyReason}
                </p>
              ) : (
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    maxLength={MAX_BODY}
                    rows={2}
                    placeholder="Write a message…"
                    className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-200"
                    aria-label="Send message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              )}
              <p className="mt-1 text-right text-[10px] text-neutral-400">{MAX_BODY - draft.length}</p>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <span className="text-sm font-bold">{initials('Recess')}</span>
            </div>
            <p className="text-sm font-semibold text-neutral-800">Pick a conversation</p>
            <p className="mt-1 max-w-xs text-xs text-neutral-400">
              Join an event to use its group chat, or wait until a connection is accepted.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
