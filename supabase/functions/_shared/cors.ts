const allowedOrigins = new Set(
  (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const supabaseHostname = (() => {
  try { return new URL(Deno.env.get('SUPABASE_URL') ?? '').hostname; } catch { return ''; }
})();
if (['kong', 'localhost', '127.0.0.1'].includes(supabaseHostname)) {
  allowedOrigins.add('http://127.0.0.1:5173');
  allowedOrigins.add('http://localhost:5173');
}

export function corsHeaders(request: Request): HeadersInit {
  const requestOrigin = request.headers.get('Origin') ?? '';
  return {
    ...(allowedOrigins.has(requestOrigin) ? { 'Access-Control-Allow-Origin': requestOrigin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Expose-Headers': 'X-Request-Id',
    'Vary': 'Origin',
  };
}

export function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  });
}

export function apiSuccess(request: Request, data: unknown, status = 200) {
  return json(request, { data, error: null }, status);
}

export function apiError(request: Request, code: string, message: string, status = 400) {
  return json(request, { data: null, error: { code, message } }, status);
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
  event_capacity: { message: 'The attendee limit cannot be lower than the number of confirmed attendees.', status: 409 },
};

export function databaseError(request: Request, error: { code?: string; message?: string } | null, fallback: string) {
  const detail = error?.message ?? '';
  const marker = detail.match(/\[([a-z_]+)\]/)?.[1];
  if (marker && knownDatabaseErrors[marker]) {
    const mapped = knownDatabaseErrors[marker];
    return apiError(request, marker, mapped.message, mapped.status);
  }

  if (error?.code === '42501' || /row-level security/i.test(detail)) {
    return apiError(request, 'forbidden', knownDatabaseErrors.forbidden.message, 403);
  }
  if (error?.code === '23505') {
    return apiError(request, 'conflict', 'This request conflicts with an existing record.', 409);
  }
  if (['22P02', '22007', '22008', '22023', '23502', '23503', '23514'].includes(error?.code ?? '')) {
    return apiError(request, 'invalid_request', 'Check the required fields, time window and location, then try again.', 400);
  }

  logError('database_operation_failed', request, { postgres_code: error?.code ?? 'unknown' });
  return apiError(request, 'request_failed', fallback, 500);
}

export function logInfo(event: string, request: Request, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    level: 'info', event, function: functionName(request), request_id: requestId(request),
    timestamp: new Date().toISOString(), ...fields,
  }));
}

export function logError(event: string, request: Request, fields: Record<string, unknown> = {}) {
  console.error(JSON.stringify({
    level: 'error', event, function: functionName(request), request_id: requestId(request),
    timestamp: new Date().toISOString(), ...fields,
  }));
}

export function withRequestLogging(
  name: string,
  handler: (request: Request) => Promise<Response>,
) {
  return async (request: Request) => {
    const headers = new Headers(request.headers);
    headers.set('x-request-id', crypto.randomUUID());
    const tracedRequest = new Request(request, { headers });
    const startedAt = performance.now();
    try {
      const response = await handler(tracedRequest);
      logInfo('edge_request_complete', tracedRequest, {
        function: name,
        method: request.method,
        status: response.status,
        duration_ms: Math.round(performance.now() - startedAt),
      });
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('X-Request-Id', headers.get('x-request-id') ?? '');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      logError('edge_request_failed', tracedRequest, {
        function: name,
        method: request.method,
        duration_ms: Math.round(performance.now() - startedAt),
        error_type: error instanceof Error ? error.name : 'UnknownError',
      });
      const response = apiError(tracedRequest, 'internal_error', 'The request could not be completed.', 500);
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('X-Request-Id', headers.get('x-request-id') ?? '');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }
  };
}

function functionName(request: Request) {
  return request.url.split('/').filter(Boolean).at(-1) ?? 'edge-function';
}

function requestId(request: Request) {
  return request.headers.get('x-request-id')
    ?? request.headers.get('sb-request-id')
    ?? crypto.randomUUID();
}
