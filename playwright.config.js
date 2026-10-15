import { defineConfig } from '@playwright/test';
import { execFileSync } from 'node:child_process';

function getLocalSupabaseEnvironment() {
  let output;
  try {
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    output = execFileSync(command, ['supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      windowsHide: true,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error('Local Supabase must be running before E2E tests. Start it with `npx supabase start`.');
  }

  const values = Object.fromEntries(output.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match) return [];
    return [[match[1], match[2].replace(/^"|"$/g, '')]];
  }));

  const apiUrl = values.API_URL;
  let hostname;
  try {
    hostname = new URL(apiUrl).hostname;
  } catch {
    throw new Error('Supabase CLI did not report a valid API_URL.');
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(hostname)) {
    throw new Error('Authenticated E2E tests are restricted to a local Supabase instance.');
  }
  if (!values.ANON_KEY || !values.SERVICE_ROLE_KEY) {
    throw new Error('Supabase CLI did not provide the local API keys required for E2E setup.');
  }

  process.env.VITE_SUPABASE_URL = apiUrl;
  process.env.VITE_SUPABASE_ANON_KEY = values.ANON_KEY;
  process.env.RECESS_E2E_SUPABASE_URL = apiUrl;
  process.env.RECESS_E2E_SERVICE_ROLE_KEY = values.SERVICE_ROLE_KEY;
}

getLocalSupabaseEnvironment();

const e2ePort = Number(process.env.RECESS_E2E_PORT) || 4174;

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: `http://127.0.0.1:${e2ePort}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: `http://127.0.0.1:${e2ePort}`,
    reuseExistingServer: true,
  },
});
