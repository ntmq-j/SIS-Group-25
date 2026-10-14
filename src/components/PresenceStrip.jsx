export default function PresenceStrip({ activeAreas = 0 }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-neutral-100 rounded-xl mb-1">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-100 text-orange-700">
        <span className="text-[10px] font-bold" aria-hidden="true">●</span>
      </div>
      <span className="text-xs text-neutral-400 ml-2">
        <span className="font-semibold text-neutral-600">{activeAreas} {activeAreas === 1 ? 'area' : 'areas'}</span>{' '}
        with people currently available
      </span>
    </div>
  );
}
