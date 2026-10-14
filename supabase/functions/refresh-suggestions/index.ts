import {
  apiError,
  apiSuccess,
  corsHeaders,
  logError,
  withRequestLogging,
} from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(withRequestLogging('refresh-suggestions', async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) });
  if (request.method !== 'POST') {
    return apiError(request, 'method_not_allowed', 'Use POST for matching suggestions.', 405);
  }

  const { client, user } = await requireUser(request);
  if (!client || !user) {
    return apiError(request, 'unauthorized', 'Sign in to view matching suggestions.', 401);
  }

  const { data: verified, error: verificationError } = await client.rpc('is_verified_user', {
    p_user_id: user.id,
  });
  if (verificationError) {
    logError('verification_check_failed', request, { postgres_code: verificationError.code ?? 'unknown' });
    return apiError(request, 'matching_unavailable', 'Matching suggestions are temporarily unavailable.', 500);
  }
  if (!verified) {
    return apiError(request, 'not_verified', 'Verify your organisation email to view matching suggestions.', 403);
  }

  const { data, error } = await client.rpc('matching_suggestions', {
    p_user_id: user.id,
  });

  if (error) {
    logError('matching_query_failed', request, { postgres_code: error.code ?? 'unknown' });
    return apiError(request, 'matching_unavailable', 'Matching suggestions are temporarily unavailable.', 500);
  }
  return apiSuccess(request, data ?? []);
}));
