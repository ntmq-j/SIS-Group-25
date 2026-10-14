import { Clock, MapPin } from 'lucide-react';
import { getCategory, toTagList } from '../lib/eventCategories';

export default function EventDetails({ event, joined, onJoin, onOpenChat }) {
  const { title, location, time, description, host, isCreator } = event;

  const c = getCategory(event.category);
  const tags = toTagList(event.tags);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
        <div className={`border-b border-neutral-100 p-5`}>
          <p className={`mb-1 text-xs font-medium ${c.text}`}>
            <span aria-hidden="true">{c.emoji}</span> {c.label} event
          </p>

          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            {title}
          </h2>

          {description && (
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              {description}
            </p>
          )}
          {Number.isFinite(event.participantLimit) && event.participantLimit > 0 && (
            <p className="mt-3 text-xs font-medium text-neutral-500">
              {event.participantCount ?? 0} / {event.participantLimit} going
            </p>
          )}
        </div>

        <div className="space-y-4 border-b border-neutral-100 p-5">
          <div className="flex gap-3">
            <div
              className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.soft} ${c.text}`}
            >
              <MapPin className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
            </div>

            <div>
              <p className="text-xs text-neutral-400">Location</p>
              <p className="text-sm font-medium text-neutral-800">{location}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div
              className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.soft} ${c.text}`}
            >
              <Clock className="h-6 w-6" strokeWidth={2.25} aria-hidden="true" />
            </div>

            <div>
              <p className="text-xs text-neutral-400">Time</p>
              <p className="text-sm font-medium text-neutral-800">{time}</p>
            </div>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="border-b border-neutral-100 p-5">
            <p className="mb-3 text-xs text-neutral-400">Who this is for</p>

            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <span
                  key={tag}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.chip}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-5">
          <p className="mb-3 text-xs text-neutral-400">Posted by</p>

          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white ${c.solid}`}
            >
              {host.initials}
            </div>

            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {host.name}
              </p>
              <p className="text-xs text-neutral-500">{host.detail}</p>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onJoin}
        disabled={joined || isCreator}
        className={`mt-5 w-full rounded-xl py-3.5 text-sm font-semibold transition-all ${
          joined || isCreator
            ? 'cursor-default bg-neutral-100 text-neutral-400'
            : `${c.joinButton} text-white shadow-xs`
        }`}
      >
        {isCreator || joined === 'hosting'
          ? 'You are hosting this event'
          : joined === 'loading'
            ? 'Checking your status…'
            : joined === 'pending'
              ? 'Request sent — awaiting host approval'
              : joined === 'going'
                ? "You're going"
                : joined === 'waitlisted'
                  ? "You're on the waitlist"
                : joined === 'interested'
                  ? "You're interested"
                  : joined === 'declined'
                    ? 'Your request was declined'
                    : joined === 'left'
                      ? 'You left this activity'
                      : 'Join event'}
      </button>

      {event.source === 'activity' && (isCreator || joined === 'going') && event.remoteId && onOpenChat && (
        <button
          type="button"
          onClick={() => onOpenChat(event.remoteId)}
          className="mt-3 w-full rounded-xl border border-orange-200 bg-white py-3.5 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50"
        >
          Open group chat
        </button>
      )}
    </>
  );
}
