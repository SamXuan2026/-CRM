import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import demoAccess from '../src/config/demoAccess.json' with { type: 'json' };

const frontendDir = fileURLToPath(new URL('../', import.meta.url));
const backendDir = fileURLToPath(new URL('../../backend/', import.meta.url));
const previewPort = Number(process.env.FRONTEND_SMOKE_PORT || 4173);
const previewHost = process.env.FRONTEND_SMOKE_HOST || '127.0.0.1';
const frontendBaseUrl = `http://${previewHost}:${previewPort}`;
const backendSmokePort = Number(process.env.FRONTEND_SMOKE_BACKEND_PORT || 5016);
const backendBaseUrl = process.env.FRONTEND_SMOKE_API_BASE_URL || `http://127.0.0.1:${backendSmokePort}`;
const previewCommand = process.env.FRONTEND_SMOKE_PREVIEW_COMMAND || 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort';
const backendCommand =
  process.env.FRONTEND_SMOKE_BACKEND_COMMAND ||
  `python3 -c "from app import create_app; app=create_app(); app.run(debug=False, host='127.0.0.1', port=${backendSmokePort})"`;

const routePaths = [
  '/login',
  '/register',
  '/dashboard',
  '/customers',
  '/sales',
  '/marketing',
  '/reports',
  '/assistant',
  '/settings',
  '/docs'
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function urlIsHealthy(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function waitForUrl(url, label) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await urlIsHealthy(url)) {
      return;
    }

    await sleep(500);
  }

  throw new Error(`${label} did not become ready: ${url}`);
}

function spawnManagedProcess(command, cwd, label) {
  const child = spawn('/bin/zsh', ['-lc', command], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  return {
    child,
    getOutput: () => output,
    label
  };
}

async function ensureBackendHealthy() {
  if (await urlIsHealthy(`${backendBaseUrl}/health`)) {
    return null;
  }

  const backend = spawnManagedProcess(backendCommand, backendDir, 'backend');

  try {
    await waitForUrl(`${backendBaseUrl}/health`, 'Backend');
    return backend;
  } catch (error) {
    throw new Error(`${error.message}\n${backend.getOutput()}`.trim());
  }
}

async function verifyDemoLogins() {
  const sessions = [];

  for (const account of demoAccess.demoAccounts) {
    const { response, payload } = await fetchJson(`${backendBaseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: account.username,
        password: account.password
      })
    });

    assert(response.ok, `Demo login failed for ${account.username}: ${response.status}`);

    const user = payload?.data?.user;
    const token = payload?.data?.access_token;
    assert(user?.role, `Demo login did not return a role for ${account.username}`);
    assert(token, `Demo login did not return an access token for ${account.username}`);

    const expectedRoute = demoAccess.defaultRoutes[user.role];
    assert(expectedRoute, `No default route configured for role ${user.role}`);

    sessions.push({
      account,
      user,
      token
    });

    process.stdout.write(`login ok: ${account.username} -> ${user.role} -> ${expectedRoute}\n`);
  }

  return sessions;
}

async function ensurePreviewReady() {
  const preview = spawnManagedProcess(previewCommand, frontendDir, 'frontend preview');

  try {
    await waitForUrl(`${frontendBaseUrl}/login`, 'Frontend preview');
    return preview;
  } catch (error) {
    throw new Error(`${error.message}\n${preview.getOutput()}`.trim());
  }
}

async function verifyRoutes() {
  for (const path of routePaths) {
    const response = await fetch(`${frontendBaseUrl}${path}`);
    const body = await response.text();
    assert(response.ok, `Route ${path} returned ${response.status}`);
    assert(body.includes('<div id="root"></div>'), `Route ${path} did not return the app shell`);
    process.stdout.write(`route ok: ${path}\n`);
  }
}

async function verifyAssistantFlows(sessions) {
  const salesSession = sessions.find((session) => session.user?.role === 'sales');
  assert(salesSession, 'No sales demo account available for assistant smoke test');

  const authHeaders = {
    Authorization: `Bearer ${salesSession.token}`,
    'Content-Type': 'application/json'
  };

  const customerListResult = await fetchJson(`${backendBaseUrl}/api/customers?page=1&per_page=1`, {
    headers: authHeaders
  });
  assert(customerListResult.response.ok, `Failed to load customers for assistant smoke test: ${customerListResult.response.status}`);

  const customer = customerListResult.payload?.data?.[0];
  assert(customer?.id, 'Assistant smoke test could not find an accessible customer');

  const staleResult = await fetchJson(`${backendBaseUrl}/api/ai/assist`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      message: '帮我找最近7天没有跟进的客户',
      context: { page: '/assistant' }
    })
  });
  assert(staleResult.response.ok, `Assistant stale customer request failed: ${staleResult.response.status}`);
  assert(staleResult.payload?.data?.intent === 'search_customers', 'Assistant stale customer intent mismatch');
  assert(staleResult.payload?.data?.target_page === '/customers', 'Assistant stale customer target page mismatch');
  assert(staleResult.payload?.data?.target_query?.stale_days === 7, 'Assistant stale customer filter missing stale_days');
  process.stdout.write('assistant ok: stale customer search -> /customers?stale_days=7\n');

  const draftResult = await fetchJson(`${backendBaseUrl}/api/ai/assist`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      message: '给这个客户生成互动记录草稿',
      context: {
        page: '/customers',
        customer_id: customer.id
      }
    })
  });
  assert(draftResult.response.ok, `Assistant interaction draft request failed: ${draftResult.response.status}`);
  assert(draftResult.payload?.data?.intent === 'generate_interaction_draft', 'Assistant interaction draft intent mismatch');
  assert(draftResult.payload?.data?.draft?.subject, 'Assistant interaction draft missing subject');
  assert(draftResult.payload?.data?.draft?.interaction_type, 'Assistant interaction draft missing interaction_type');
  assert(draftResult.payload?.data?.draft?.next_action, 'Assistant interaction draft missing next_action');
  process.stdout.write(`assistant ok: interaction draft for customer ${customer.id}\n`);
}

async function main() {
  const ownedProcesses = [];

  const backend = await ensureBackendHealthy();
  if (backend) {
    ownedProcesses.push(backend);
  }

  const sessions = await verifyDemoLogins();
  const preview = await ensurePreviewReady();
  ownedProcesses.push(preview);

  try {
    await verifyRoutes();
    await verifyAssistantFlows(sessions);
  } finally {
    for (const processHandle of ownedProcesses.reverse()) {
      processHandle.child.kill('SIGTERM');
      await sleep(500);
      if (!processHandle.child.killed) {
        processHandle.child.kill('SIGKILL');
      }
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
