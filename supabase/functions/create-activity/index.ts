import { apiError, apiSuccess, corsHeaders, databaseError } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

const allowedCategories = new Set([
  'coffee_break', 'lunch', 'study_session', 'walk',
  'casual_game', 'group_discussion', 'other',
]);
const maxTags = 6;
const maxTagLength = 24;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return apiError('method_not_allowed', 'Use POST to create an activity.', 405);

  const { client, user } = await requireUser(request);
  if (!client || !user) return apiError('unauthorized', 'Sign in to create an activity.', 401);

  try {
    const body = await request.json();
    const tags = Array.isArray(body.tags)
      ? body.tags
        .filter((tag: unknown): tag is string => typeof tag === 'string')
        .map((tag: string) => tag.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
      : [];
    const payload = {
      area_id: body.area_id,
      title: typeof body.title === 'string' ? body.title.trim() : body.title,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      category: body.category,
      start_time: body.start_time,
      end_time: body.end_time,
      participant_limit: body.participant_limit ?? 3,
      tags,
      location_label: typeof body.location_label === 'string' ? body.location_label.trim() : null,
      latitude: body.latitude,
      longitude: body.longitude,
    };

    if (!payload.area_id || !payload.title || !allowedCategories.has(payload.category)) {
      return apiError('invalid_request', 'area_id, title and a valid category are required.', 400);
    }
    if (tags.length > maxTags || tags.some((tag) => tag.length > maxTagLength)) {
      return apiError('invalid_request', `Tags must contain at most ${maxTags} values of ${maxTagLength} characters or fewer.`, 400);
    }

    const { data, error } = await client
      .from('activities')
      .insert(payload)
      .select('id, title, description, category, tags, start_time, end_time, participant_limit, location_label, latitude, longitude, area_id')
      .single();

    if (error) return databaseError(error, 'Unable to create this activity.');
    return apiSuccess(data, 201);
  } catch (error) {
    return apiError('invalid_request', error instanceof SyntaxError ? 'Request body must be valid JSON.' : 'Unable to create this activity.', 400);
  }
});
