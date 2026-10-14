const baseUrl = process.env.LOAD_URL || 'http://127.0.0.1:5173/';
const concurrency = Number(process.env.LOAD_CONCURRENCY || 10);
const rounds = Number(process.env.LOAD_ROUNDS || 5);

const started = Date.now();
const results = [];
for (let round = 0; round < rounds; round += 1) {
  const batch = await Promise.all(Array.from({ length: concurrency }, async () => {
    const begin = performance.now();
    try {
      const response = await fetch(baseUrl);
      return { ok: response.ok, status: response.status, ms: performance.now() - begin };
    } catch (error) {
      return { ok: false, status: 0, ms: performance.now() - begin, error: error.message };
    }
  }));
  results.push(...batch);
}

const successful = results.filter((result) => result.ok);
const average = results.reduce((sum, result) => sum + result.ms, 0) / results.length;
console.log(JSON.stringify({ url: baseUrl, requests: results.length, successful: successful.length, failed: results.length - successful.length, averageMs: Math.round(average), elapsedMs: Date.now() - started }, null, 2));
if (successful.length !== results.length) process.exitCode = 1;
