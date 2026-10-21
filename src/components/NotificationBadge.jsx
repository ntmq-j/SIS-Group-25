export default function NotificationBadge({ count, label }) {
  if (!count) return null;
  return <span aria-label={`${count} ${label}`} className="inline-flex min-w-4 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{count > 99 ? '99+' : count}</span>;
}
