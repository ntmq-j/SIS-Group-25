import { apiError, apiSuccess, corsHeaders } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') {
    return apiError('method_not_allowed', 'Use POST for matching suggestions.', 405);
  }

  const { client, user } = await requireUser(request);
  if (!client || !user) {
    return apiError('unauthorized', 'Sign in to view matching suggestions.', 401);
  }

  const { data: verified, error: verificationError } = await client.rpc('is_verified_user', {
    p_user_id: user.id,
  });
  if (verificationError) {
    return apiError('matching_unavailable', 'Matching suggestions are temporarily unavailable.', 500);
  }
  if (!verified) {
    return apiError('not_verified', 'Verify your organisation email to view matching suggestions.', 403);
  }

  const { data, error } = await client.rpc('matching_suggestions', {
    p_user_id: user.id,
  });

  if (error) {
    console.error('refresh-suggestions failed:', error.message);
    return apiError('matching_unavailable', 'Matching suggestions are temporarily unavailable.', 500);
  }
  return apiSuccess(data ?? []);
});
