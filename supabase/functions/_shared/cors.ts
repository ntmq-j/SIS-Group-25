export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function apiSuccess(data: unknown, status = 200) {
  return json({ data, error: null }, status);
}

export function apiError(code: string, message: string, status = 400) {
  return json({ data: null, error: { code, message } }, status);
}

const knownDatabaseErrors: Record<string, { message: string; status: number }> = {
  invalid_time_window: { message: 'Choose a valid start and end time (maximum four hours).', status: 400 },
  invalid_area: { message: 'Choose an area within the selected location.', status: 400 },
  invalid_transition: { message: 'That status change is not allowed.', status: 409 },
  not_verified: { message: 'Verify your organisation email before continuing.', status: 403 },
  forbidden: { message: 'You do not have permission to perform this action.', status: 403 },
  expired: { message: 'This event has expired and can no longer be changed.', status: 409 },
  rate_limited: { message: 'You have reached the current request limit. Please try again later.', status: 429 },
  activity_full: { message: 'This activity has reached its participant limit.', status: 409 },
  activity_cancelled: { message: 'This activity has been cancelled.', status: 409 },
};

export function databaseError(error: { code?: string; message?: string } | null, fallback: string) {
  const detail = error?.message ?? '';
  const marker = detail.match(/\[([a-z_]+)\]/)?.[1];
  if (marker && knownDatabaseErrors[marker]) {
    const mapped = knownDatabaseErrors[marker];
    return apiError(marker, mapped.message, mapped.status);
  }

  if (error?.code === '42501' || /row-level security/i.test(detail)) {
    return apiError('forbidden', knownDatabaseErrors.forbidden.message, 403);
  }
  if (error?.code === '23505') {
    return apiError('conflict', 'This request conflicts with an existing record.', 409);
  }
  if (['22P02', '22007', '22008', '22023', '23502', '23503', '23514'].includes(error?.code ?? '')) {
    return apiError('invalid_request', 'Check the required fields, time window and location, then try again.', 400);
  }

  // Never forward raw Postgres error details or SQL/constraint names to the
  // browser. Keep the detailed error in server logs for developers instead.
  console.error('Database operation failed:', error?.code ?? 'unknown');
  return apiError('request_failed', fallback, 500);
}
