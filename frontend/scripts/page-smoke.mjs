import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import demoAccess from '../src/config/demoAccess.json' with { type: 'json' };

const frontendDir = fileURLToPath(new URL('../', import.meta.url));
const backendDir = fileURLToPath(new URL('../../backend/', import.meta.url));
const previewPort = Number(process.env.FRONTEND_SMOKE_PORT || 4173);
const previewHost = process.env.FRONTEND_SMOKE_HOST || '127.0.0.1';
const frontendBaseUrl = `http://${previewHost}:${previewPort}`;
const backendBaseUrl = process.env.FRONTEND_SMOKE_API_BASE_URL || 'http://127.0.0.1:5006';
const previewCommand = process.env.FRONTEND_SMOKE_PREVIEW_COMMAND || 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort';
const backendCommand = process.env.FRONTEND_SMOKE_BACKEND_COMMAND || 'python3 app.py';

const routePaths = [
  '/login',
  '/register',
  '/dashboard',
  '/customers',
  '/sales',
  '/marketing',
  '/reports',
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

    process.stdout.write(`login ok: ${account.username} -> ${user.role} -> ${expectedRoute}\n`);
  }
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

async function main() {
  const ownedProcesses = [];

  const backend = await ensureBackendHealthy();
  if (backend) {
    ownedProcesses.push(backend);
  }

  await verifyDemoLogins();
  const preview = await ensurePreviewReady();
  ownedProcesses.push(preview);

  try {
    await verifyRoutes();
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
