import { CalendarDays, Compass, LogOut, MessageCircle, Plus, UserRound, X } from 'lucide-react';
import BrandMark from './BrandMark';

const navItemClass = 'inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium leading-5 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:min-h-0 sm:min-w-0 sm:justify-start sm:px-2.5 sm:text-xs';

export default function Header({ page, onBack, showEventForm, onToggle, onNavigate, onSignOut }) {
    return (
      <header className="sticky top-4 z-10 mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-100 bg-white px-3 py-2.5 shadow-sm sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark
            href="/"
            className="text-lg sm:text-xl"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('feed');
            }}
          />
          {['event', 'profile', 'calendar', 'matching', 'connections', 'requests', 'chat', 'preferences', 'admin'].includes(page) && (
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-semibold text-neutral-500 hover:text-neutral-800 transition-colors"
            >
              ← Back
            </button>
          )}
        </div>
        <nav aria-label="Primary navigation" className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1">
          {page === 'feed' && (
            <>
            <button
              type="button"
              onClick={() => onNavigate('calendar')}
              aria-label="My events"
              className={navItemClass}
            >
              <CalendarDays size={14} aria-hidden="true" />
              <span className="hidden sm:inline">My events</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('matching')}
              aria-label="Discover"
              className={navItemClass}
            >
              <Compass size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Discover</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('chat')}
              aria-label="Chat"
              className={navItemClass}
            >
              <MessageCircle size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Chat</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('profile')}
              aria-label="Profile"
              className={navItemClass}
            >
              <UserRound size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Profile</span>
            </button>

            <span className="mx-0.5 hidden h-6 w-px bg-neutral-200 sm:block" aria-hidden="true" />

            <div className="inline-flex items-center gap-1.5 px-1.5 py-1.5 text-[10px] font-medium text-neutral-400 sm:text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" aria-hidden="true" />
              <span className="hidden sm:inline">UTS Campus</span>
              <span className="sm:hidden">UTS</span>
            </div>

            <button
              type="button"
              onClick={onToggle}
              className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1.5 text-[11px] font-semibold leading-5 text-white transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:min-h-0 sm:min-w-0 sm:gap-1.5 sm:justify-start sm:px-3 sm:text-xs"
            >
              {showEventForm ? <X size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
              <span className="hidden sm:inline">{showEventForm ? 'Cancel' : 'Host event'}</span>
              <span className="sm:hidden">{showEventForm ? 'Cancel' : 'Host'}</span>
            </button>
            </>
          )}
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out"
            className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium leading-5 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:min-h-0 sm:min-w-0 sm:justify-start sm:px-2.5 sm:text-xs"
          >
            <LogOut size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </nav>
      </header>
    );
  }
