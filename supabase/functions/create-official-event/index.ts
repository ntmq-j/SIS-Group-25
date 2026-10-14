import { apiError, apiSuccess, corsHeaders, databaseError } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return apiError('method_not_allowed', 'Use POST to create an official event.', 405);

  const { client, user } = await requireUser(request);
  if (!client || !user) return apiError('unauthorized', 'Sign in to create an official event.', 401);

  try {
    const body = await request.json();
    const payload = {
      organisation_id: body.organisation_id,
      creator_id: user.id,
      title: typeof body.title === 'string' ? body.title.trim() : body.title,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      location_id: body.location_id,
      area_id: body.area_id ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      start_time: body.start_time,
      end_time: body.end_time,
      status: body.status ?? 'draft',
    };

    const { data, error } = await client
      .from('official_events')
      .insert(payload)
      .select()
      .single();

    if (error) return databaseError(error, 'Unable to create this official event.');
    return apiSuccess(data, 201);
  } catch (error) {
    return apiError('invalid_request', error instanceof SyntaxError ? 'Request body must be valid JSON.' : 'Unable to create this official event.', 400);
  }
});
