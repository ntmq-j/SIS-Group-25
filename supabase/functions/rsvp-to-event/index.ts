import {
  apiError,
  apiSuccess,
  corsHeaders,
  databaseError,
  withRequestLogging,
} from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(withRequestLogging('rsvp-to-event', async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return apiError(request, 'method_not_allowed', 'Use POST to RSVP to an event.', 405);

  const { client, user } = await requireUser(request);
  if (!client || !user) return apiError(request, 'unauthorized', 'Sign in to RSVP to an event.', 401);

  try {
    const body = await request.json();
    if (!body.event_id || !['going', 'interested'].includes(body.status ?? 'going')) {
      return apiError(request, 'invalid_request', 'event_id and a valid status are required.', 400);
    }

    const { data, error } = await client
      .from('event_rsvps')
      .upsert({ event_id: body.event_id, user_id: user.id, status: body.status ?? 'going' }, { onConflict: 'event_id,user_id' })
      .select()
      .single();

    if (error) return databaseError(request, error, 'Unable to save this RSVP.');
    return apiSuccess(request, data);
  } catch (error) {
    return apiError(request, 'invalid_request', error instanceof SyntaxError ? 'Request body must be valid JSON.' : 'Unable to save this RSVP.', 400);
  }
}));
