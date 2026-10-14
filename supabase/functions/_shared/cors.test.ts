Deno.env.set('ALLOWED_ORIGINS', 'https://recess.test,https://staging.recess.test');
Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');

const { corsHeaders, withRequestLogging } = await import('./cors.ts');

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test('CORS reflects only explicitly allowed origins', () => {
  const allowed = new Request('https://edge.test', {
    headers: { Origin: 'https://recess.test' },
  });
  const denied = new Request('https://edge.test', {
    headers: { Origin: 'https://attacker.test' },
  });

  assert(
    new Headers(corsHeaders(allowed)).get('Access-Control-Allow-Origin') === 'https://recess.test',
    'configured origin should be allowed',
  );
  assert(
    new Headers(corsHeaders(allowed)).get('Access-Control-Expose-Headers')?.includes('X-Request-Id') === true,
    'browser clients should be able to read the request ID',
  );
  assert(
    new Headers(corsHeaders(denied)).get('Access-Control-Allow-Origin') === null,
    'unconfigured origin must not receive CORS permission',
  );
});

Deno.test('request logging adds a request ID and hides unexpected errors', async () => {
  const handler = withRequestLogging('cors-test', async () => {
    throw new Error('sensitive internal details');
  });
  const response = await handler(new Request('https://edge.test/function'));
  const body = await response.json();

  assert(response.status === 500, 'unexpected errors should return 500');
  assert(Boolean(response.headers.get('X-Request-Id')), 'response should carry a request ID');
  assert(body.error.message === 'The request could not be completed.', 'response must not expose internal errors');
});

Deno.test('request logging preserves JSON request bodies', async () => {
  const handler = withRequestLogging('cors-body-test', async (request) => {
    const payload = await request.json();
    return Response.json(payload);
  });
  const response = await handler(new Request('https://edge.test/function', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: 'test-id' }),
  }));

  assert(response.status === 200, 'wrapped handler should accept a JSON request');
  assert((await response.json()).event_id === 'test-id', 'wrapped handler should preserve request payload');
});
