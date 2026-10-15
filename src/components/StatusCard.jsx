import Avatar from './Avatar';

function formatStatusTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Just now';

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today at ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} at ${time}`;
}

export default function StatusCard({ item }) {
  const timestamp = item.createdAt || item.time;
  const formattedTime = formatStatusTime(timestamp);
  return (
    <div className="min-w-0 overflow-hidden bg-white border border-neutral-100 rounded-2xl p-4 hover:border-neutral-200 transition-colors">
      <div className="flex gap-2.5 items-center mb-3">
        <Avatar name={item.author} variant="neutral" />
        <div>
          <p className="text-sm font-semibold text-neutral-900 leading-none">{item.author}</p>
          <time
            className="mt-0.5 block text-[11px] text-neutral-400"
            dateTime={timestamp || undefined}
            title={timestamp ? new Date(timestamp).toLocaleString() : undefined}
          >
            {formattedTime}
          </time>
        </div>
      </div>
      <p className="text-sm text-neutral-800 bg-neutral-50 rounded-xl px-3 py-2.5 leading-relaxed">
        {item.text}
      </p>
    </div>
  );
}
