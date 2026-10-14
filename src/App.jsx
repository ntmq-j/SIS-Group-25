import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import Auth from './components/Auth';
import Header from './components/Header';
import PresenceStrip from './components/PresenceStrip';
import StatusInput from './components/StatusInput';
import StatusCard from './components/StatusCard';
import EventCard from './components/EventCard';
import LegalPage from './components/LegalPage';

const EventForm = lazy(() => import('./components/EventForm'));
const EventDetails = lazy(() => import('./components/EventDetails'));
const CampusMap = lazy(() => import('./components/CampusMap'));
const Profile = lazy(() => import('./components/Profile'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const CommunityHub = lazy(() => import('./components/CommunityHub'));
const LandingPrototype = lazy(() => import('./components/LandingPrototype'));

import { supabase } from './lib/supabaseClient';
import { CURRENT_USER, SAMPLE_EVENT } from './constants/seed';
import { initials } from './utils/helpers';
import {
  createActivity,
  cancelActivity,
  joinActivity,
  loadActiveMapPoints,
  loadAreas,
  loadOfficialEventRsvpInfo,
  mapPointToMapItem,
  mapPointToFeedItem,
  rsvpToEvent,
  loadMyEventParticipation,
  subscribeToMapChanges,
  updateActivity,
} from './services/events';
import { createStatusPost, loadStatusPosts, subscribeToStatusPosts } from './services/community';

export default function App() {
  const [page, setPage] = useState(() => {
    if (window.location.pathname === '/terms') return 'terms';
    if (window.location.pathname === '/privacy') return 'privacy';
    const requestedAuthMode = new URLSearchParams(window.location.search).get('auth');
    if (requestedAuthMode === 'signin' || requestedAuthMode === 'signup') return 'auth';
    return 'landing';
  });
  const [authMode, setAuthMode] = useState(() => (
    new URLSearchParams(window.location.search).get('auth') === 'signup' ? 'signup' : 'signin'
  ));
  const [legalReturnPage, setLegalReturnPage] = useState('landing');
  const [session, setSession] = useState(null);
  // Feed events come from the privacy-preserving active_map_points RPC. Do
  // not seed fake events into a signed-in user's production feed.
  const [feed, setFeed] = useState([]);
  const [mapPoints, setMapPoints] = useState([]);
  const [areas, setAreas] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [joined, setJoined] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [eventError, setEventError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingEvent, setEditingEvent] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [signOutError, setSignOutError] = useState(null);
  const [chatActivityId, setChatActivityId] = useState(null);

  const refreshRemoteFeed = useCallback(async () => {
    if (!session) return;
    setLoadingFeed(true);
    try {
      const points = await loadActiveMapPoints();
      const hostFallback = session?.user?.user_metadata?.display_name || CURRENT_USER;
      const remoteEvents = points
        .filter((point) => point.point_type === 'activity' || point.point_type === 'official_event')
        .map((point) => mapPointToFeedItem(point, hostFallback));
      setMapPoints(points.map((point) => mapPointToMapItem(point, hostFallback)));
      setFeed((previous) => [
        ...previous.filter((item) => item.type === 'status'),
        ...remoteEvents,
      ]);
      setEventError(null);
    } catch (error) {
      setEventError(error?.message ?? 'Unable to load events from Supabase.');
    } finally {
      setLoadingFeed(false);
    }
  }, [session]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!mounted) return;
      if (currentSession) {
        const { error } = await supabase.auth.getUser();
        if (error) {
          await supabase.auth.signOut();
          if (mounted) setPage('landing');
          return;
        }
      }
      setSession(currentSession);
      if (currentSession) setPage('feed');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) setPage('feed');
      else setPage((currentPage) => (
        currentPage === 'terms' || currentPage === 'privacy' || currentPage === 'auth'
          ? currentPage
          : 'landing'
      ));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    loadAreas().then((loadedAreas) => {
      if (active) setAreas(loadedAreas);
    }).catch((error) => {
      if (active) setEventError(error?.message ?? 'Unable to load approved areas.');
    });
    const refreshTimer = window.setTimeout(async () => {
      try {
        const [statusPosts] = await Promise.all([loadStatusPosts(), refreshRemoteFeed()]);
        if (active) setFeed((previous) => [
          ...statusPosts,
          ...previous.filter((item) => item.type === 'event'),
        ]);
      } catch (error) {
        if (active) setStatusError(error?.message ?? 'Unable to load status updates.');
      }
    }, 0);
    const unsubscribe = subscribeToMapChanges(() => { void refreshRemoteFeed(); });
    const unsubscribeStatuses = subscribeToStatusPosts(async () => {
      try {
        const statusPosts = await loadStatusPosts();
        if (active) setFeed((previous) => [
          ...statusPosts,
          ...previous.filter((item) => item.type === 'event'),
        ]);
      } catch (error) {
        if (active) setStatusError(error?.message ?? 'Unable to refresh status updates.');
      }
    });
    return () => {
      active = false;
      window.clearTimeout(refreshTimer);
      unsubscribe();
      unsubscribeStatuses();
    };
  }, [session, refreshRemoteFeed]);

  useEffect(() => {
    if (!session || page !== 'event' || selectedEvent?.source !== 'official_event' || !selectedEvent.remoteId) return undefined;
    let active = true;
    const refreshRsvp = async () => {
      try {
        const [status, info] = await Promise.all([
          loadMyEventParticipation('official_event', selectedEvent.remoteId),
          loadOfficialEventRsvpInfo(selectedEvent.remoteId),
        ]);
        if (!active) return;
        setJoined(status);
        setSelectedEvent((current) => current?.remoteId === selectedEvent.remoteId ? { ...current, ...info } : current);
      } catch (error) {
        if (active) setEventError(error?.message ?? 'Unable to refresh this event.');
      }
    };
    const initialRefresh = window.setTimeout(() => { void refreshRsvp(); }, 0);
    const unsubscribe = subscribeToMapChanges(() => { void refreshRsvp(); });
    return () => {
      active = false;
      window.clearTimeout(initialRefresh);
      unsubscribe();
    };
  }, [page, selectedEvent?.remoteId, selectedEvent?.source, session]);

  const handlePostStatus = async (text) => {
    setStatusError(null);
    try {
      await createStatusPost(text);
      const statusPosts = await loadStatusPosts();
      setFeed((previous) => [...statusPosts, ...previous.filter((item) => item.type === 'event')]);
    } catch (error) {
      setStatusError(error?.message ?? 'Unable to publish your status.');
      return false;
    }
  };

  // tags are now part of the payload and must be written to Supabase.
  const handlePublishEvent = async ({ title, location, description, category, tags, participantLimit, areaId, startTime, endTime, latitude, longitude }) => {
    setPublishing(true);
    setEventError(null);
    try {
      const payload = {
        area_id: areaId,
        title,
        description,
        category,
        tags,
        participant_limit: participantLimit,
        start_time: startTime,
        end_time: endTime,
        location_label: location,
        latitude,
        longitude,
      };
      if (editingEvent?.remoteId) {
        await updateActivity(editingEvent.remoteId, payload);
      } else {
        await createActivity(payload);
      }
      await refreshRemoteFeed();
      setShowEventForm(false);
      setEditingEvent(null);
    } catch (error) {
      setEventError(error?.message ?? 'Unable to publish this event.');
    } finally {
      setPublishing(false);
    }
  };

  // category + tags must be copied onto selectedEvent, or EventDetails
  // renders the fallback colour and no tags.
  const handleOpenEvent = (item) => {
    setEventError(null);
    setSelectedEvent({
      remoteId: item.remoteId,
      source: item.source,
      isCreator: item.isCreator,
      title: item.title,
      description: item.description || 'Join this Recess meetup and connect with people nearby.',
      location: item.location,
      time: item.time,
      category: item.category ?? 'other',
      tags: item.tags ?? [],
      participantCount: item.participantCount ?? 0,
      participantLimit: item.participantLimit ?? null,
      host: {
        name: item.author,
        initials: initials(item.author),
        detail: item.source === 'official_event' ? 'Approved organisation event' : 'Verified Recess user',
      },
    });
    setJoined(item.isCreator ? 'hosting' : 'loading');
    setPage('event');
    if (!item.isCreator) {
      loadMyEventParticipation(item.source, item.remoteId)
        .then((status) => setJoined(status))
        .catch(() => setJoined(null));
    }
  };

  const handleJoinEvent = async () => {
    if (!selectedEvent?.remoteId) {
      setJoined(true);
      return;
    }
    try {
      if (selectedEvent.source === 'official_event') {
        const rsvp = await rsvpToEvent(selectedEvent.remoteId);
        setJoined(rsvp?.status ?? 'going');
        const info = await loadOfficialEventRsvpInfo(selectedEvent.remoteId);
        setSelectedEvent((current) => current?.remoteId === selectedEvent.remoteId ? { ...current, ...info } : current);
      } else {
        await joinActivity(selectedEvent.remoteId);
        setJoined('pending');
      }
    } catch (error) {
      const message = error?.message ?? '';
      setEventError(message.includes('[forbidden]')
        ? 'The event creator is already a participant in this meetup.'
        : message || 'Unable to join this event.');
    }
  };

  const handleDeleteEvent = async (remoteId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await cancelActivity(remoteId);
      await refreshRemoteFeed();
    } catch (err) {
      alert('Failed to cancel event: ' + err.message);
    }
  };

  const handleEditEvent = (item) => {
    setEditingEvent(item);
    setShowEventForm(true); 
  };

  const handleOpenActivityChat = (activityId) => {
    setChatActivityId(activityId);
    setPage('chat');
  };

  const currentEvent = selectedEvent ?? SAMPLE_EVENT;

  const navigate = (nextPage, path) => {
    window.history.pushState({}, '', path);
    setPage(nextPage);
  };

  const openLegal = (type, mode = authMode) => {
    setLegalReturnPage(page === 'terms' || page === 'privacy' ? 'landing' : page);
    setAuthMode(mode);
    navigate(type, `/${type}`);
  };

  const closeLegal = () => {
    const returnPage = legalReturnPage === 'auth' ? 'auth' : 'landing';
    navigate(returnPage, '/');
  };

  const handleSignOut = async () => {
    setSignOutError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setSignOutError(error.message || 'Unable to sign out. Please try again.');
  };

  if (page === 'terms' || page === 'privacy') return <LegalPage type={page} onBack={closeLegal} />;

  if (page === 'landing') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-brand-paper p-6 text-sm text-neutral-500">Loading Recess…</div>}>
        <LandingPrototype />
      </Suspense>
    );
  }

  if (page === 'auth') {
    return <Auth mode={authMode} onBack={() => navigate('landing', '/')} onSuccess={() => navigate('feed', '/')} onOpenLegal={openLegal} />;
  }

  return (
    <div className="min-h-screen bg-brand-paper p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-7xl">
        <Header
          page={page}
          onBack={() => { setChatActivityId(null); setPage('feed'); }}
          showEventForm={showEventForm}
          onToggle={() => { setEventError(null); setShowEventForm((visible) => !visible); }}
          onNavigate={(nextPage) => { if (nextPage !== 'chat') setChatActivityId(null); setPage(nextPage); }}
          onSignOut={handleSignOut}
        />
        {signOutError && <p role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{signOutError}</p>}

        <Suspense fallback={<p className="rounded-xl bg-white p-6 text-sm text-neutral-500">Loading Recess…</p>}>
          {page === 'calendar' ? (
            <CalendarView />
          ) : ['matching', 'connections', 'requests', 'chat', 'preferences', 'admin'].includes(page) ? (
            <CommunityHub initialTab={page} currentUserId={session?.user?.id} initialActivityId={chatActivityId} />
          ) : page === 'event' ? (
            <>
              {eventError && <p role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{eventError}</p>}
              <EventDetails event={currentEvent} joined={joined} onJoin={handleJoinEvent} onOpenChat={handleOpenActivityChat} />
            </>
          ) : page === 'profile' ? (
            <Profile />
          ) : (
          <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start">
            <div className="space-y-3">
              <PresenceStrip
                activeAreas={mapPoints.filter((point) => point.type === 'presence').length}
              />
              {eventError && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{eventError}</p>}
              {statusError && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{statusError}</p>}
              {showEventForm && (
                <EventForm
                  initialData={editingEvent}
                  areas={areas}
                  onSubmit={handlePublishEvent}
                  onCancel={() => {
                    setShowEventForm(false);
                    setEditingEvent(null);
                  }}
                  submitting={publishing}
                />
              )}
              

              <StatusInput onPost={handlePostStatus} />

              {/* Event Category Filter Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                {[
                  { label: 'All', value: 'all' },
                  { label: 'Study session', value: 'study_session' },
                  { label: 'Coffee break', value: 'coffee_break' },
                  { label: 'Lunch', value: 'lunch' },
                  { label: 'Walk', value: 'walk' },
                  { label: 'Casual game', value: 'casual_game' },
                  { label: 'Group discussion', value: 'group_discussion' },
                ].map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap ${
                      selectedCategory === cat.value
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Today's updates</p>

              {loadingFeed && <p className="py-4 text-center text-xs text-neutral-400">Loading events…</p>}
              {!loadingFeed && feed.length === 0 && <p className="py-16 text-center text-sm text-neutral-400">Nothing here yet. Post a status or host an event.</p>}

              {feed
                .filter((item) => {
                  if (selectedCategory === 'all') return true;
                  if (item.type === 'status') return true; // keeps status posts visible regardless of filter
                  return item.category === selectedCategory;
                })
                .map((item) => item.type === 'event'
                  ? <EventCard 
                      key={item.id} 
                      item={item} 
                      onOpen={() => handleOpenEvent(item)} 
                      onEdit={(item) => handleEditEvent(item)}
                      onDelete={(remoteId) => handleDeleteEvent(remoteId)}
                    />
                  : <StatusCard key={item.id} item={item} />)}
            </div>

            <div className="lg:sticky lg:top-6">
              <CampusMap events={mapPoints} />
            </div>
          </div>
          )}
        </Suspense>

        <footer className="text-center text-[11px] text-neutral-400 mt-12 pt-6 border-t border-neutral-100">Recess v1.3 · Campus coordination for UTS</footer>
      </div>

    </div>
  );
}
