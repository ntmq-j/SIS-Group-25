import {
  apiError,
  apiSuccess,
  corsHeaders,
  databaseError,
  withRequestLogging,
} from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(withRequestLogging('create-official-event', async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') return apiError(request, 'method_not_allowed', 'Use POST to create an official event.', 405);

  const { client, user } = await requireUser(request);
  if (!client || !user) return apiError(request, 'unauthorized', 'Sign in to create an official event.', 401);

  try {
    const body = await request.json();
    const participantLimit = body.participant_limit ?? null;
    if (participantLimit !== null && (!Number.isInteger(participantLimit) || participantLimit < 1 || participantLimit > 10000)) {
      return apiError(request, 'invalid_request', 'Attendee limit must be a whole number between 1 and 10,000.', 400);
    }
    const payload = {
      organisation_id: body.organisation_id,
      creator_id: user.id,
      title: typeof body.title === 'string' ? body.title.trim() : body.title,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      location_id: body.location_id,
      area_id: body.area_id ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      participant_limit: participantLimit,
      start_time: body.start_time,
      end_time: body.end_time,
      status: body.status ?? 'draft',
    };

    const { data, error } = await client
      .from('official_events')
      .insert(payload)
      .select()
      .single();

    if (error) return databaseError(request, error, 'Unable to create this official event.');
    return apiSuccess(request, data, 201);
  } catch (error) {
    return apiError(request, 'invalid_request', error instanceof SyntaxError ? 'Request body must be valid JSON.' : 'Unable to create this official event.', 400);
  }
}));
