import { useEffect, useState } from 'react';
import { EMPTY_NOTIFICATIONS, loadNotifications, subscribeToCommunityChanges } from '../services/notifications';

export function useNotifications(userId) {
  const [state, setState] = useState({ userId: null, counts: EMPTY_NOTIFICATIONS, error: null });
  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    let sequence = 0;
    let timer;
    const load = async () => {
      const request = ++sequence;
      try {
        const counts = await loadNotifications(userId);
        if (active && request === sequence) setState({ userId, counts, error: null });
      } catch (error) {
        if (active && request === sequence) setState((previous) => ({
          userId, counts: previous.userId === userId ? previous.counts : EMPTY_NOTIFICATIONS,
          error: error.message || 'Unable to load notifications.',
        }));
      }
    };
    const refresh = () => { clearTimeout(timer); timer = setTimeout(load, 150); };
    refresh();
    const unsubscribe = subscribeToCommunityChanges(refresh);
    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('recess:notifications', refresh);
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
      unsubscribe();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('recess:notifications', refresh);
    };
  }, [userId]);
  return state.userId === userId ? state : { counts: EMPTY_NOTIFICATIONS, error: null };
}
