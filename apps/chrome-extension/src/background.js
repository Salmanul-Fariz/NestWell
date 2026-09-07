import {
  ACCESS_TOKEN_KEY,
  DEFAULT_API_BASE,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  getDomain,
  normalizeOrigin,
} from './shared.js';

async function getSettings() {
  const values = await chrome.storage.local.get([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  return {
    ...values,
    apiBase: DEFAULT_API_BASE.replace(/\/$/, ''),
  };
}

async function saveSession(result, apiBase) {
  await chrome.storage.local.set({
    [ACCESS_TOKEN_KEY]: result.accessToken,
    [REFRESH_TOKEN_KEY]: result.refreshToken,
    [USER_KEY]: result.user,
  });
}

async function clearSession() {
  await chrome.storage.local.remove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
}

async function notifyTabsLocked() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(
    tabs
      .filter((tab) => tab.id !== undefined)
      .map(async (tab) => {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'sessionLocked' });
        } catch {
          // Ignore tabs without a NestWell content script or browser-internal pages.
        }
      }),
  );
}

async function request(path, options = {}, canRefresh = true) {
  const settings = await getSettings();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (settings.accessToken) headers.set('Authorization', `Bearer ${settings.accessToken}`);

  const response = await fetch(`${settings.apiBase}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && canRefresh && settings.refreshToken) {
    const refreshResponse = await fetch(`${settings.apiBase}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: settings.refreshToken }),
    });
    if (refreshResponse.ok) {
      const refreshed = await refreshResponse.json();
      await saveSession({ ...refreshed, user: settings.user }, settings.apiBase);
      return request(path, options, false);
    }
    await clearSession();
    throw new Error('AUTH_REQUIRED');
  }

  if (response.status === 401) {
    await clearSession();
    throw new Error('AUTH_REQUIRED');
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
      // Keep the status message when the server did not return JSON.
    }
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return response.status === 204 ? null : response.json();
}

function entryOrigin(entry) {
  if (!entry.url) return null;
  return normalizeOrigin(entry.url.includes('://') ? entry.url : `https://${entry.url}`);
}

async function getEntries() {
  return request('/vault');
}

async function getMatches(pageUrl) {
  const pageOrigin = normalizeOrigin(pageUrl);
  if (!pageOrigin) return [];
  const entries = await getEntries();
  return entries
    .filter((entry) => entryOrigin(entry) === pageOrigin)
    .map(({ _id, title, username, url }) => ({ _id, title, username, url }));
}

async function login(email, password) {
  const base = DEFAULT_API_BASE.replace(/\/$/, '');
  const response = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    let message = 'Incorrect email or password.';
    try {
      const body = await response.json();
      message = body.message || message;
    } catch {
      // Use the default message.
    }
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  const result = await response.json();
  await saveSession(result, base);
  return result.user;
}

async function reveal(id) {
  return request(`/vault/${encodeURIComponent(id)}/reveal`, {
    method: 'POST',
    body: JSON.stringify({ expiresInSeconds: 30 }),
  });
}

async function saveCandidate(candidate) {
  const origin = normalizeOrigin(candidate.url);
  if (!origin) throw new Error('This page does not have a supported website origin.');
  return request('/vault', {
    method: 'POST',
    body: JSON.stringify({
      title: candidate.title || getDomain(candidate.url) || 'Website login',
      username: candidate.username || undefined,
      password: candidate.password,
      url: origin,
      category: candidate.category || 'PERSONAL',
    }),
  });
}

async function updateCandidate(id, candidate) {
  const origin = normalizeOrigin(candidate.url);
  if (!origin) throw new Error('This page does not have a supported website origin.');
  return request(`/vault/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: candidate.title || getDomain(candidate.url) || 'Website login',
      username: candidate.username || undefined,
      password: candidate.password,
      url: origin,
      category: candidate.category || 'PERSONAL',
    }),
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'getState': {
        const settings = await getSettings();
        return {
          loggedIn: Boolean(settings.accessToken || settings.refreshToken),
          user: settings.user,
          apiBase: settings.apiBase,
        };
      }
      case 'login':
        return { user: await login(message.email, message.password) };
      case 'logout':
        await clearSession();
        await notifyTabsLocked();
        return { success: true };
      case 'getEntries':
        return { entries: await getEntries() };
      case 'getMatches':
        return { entries: await getMatches(message.url) };
      case 'reveal':
        return await reveal(message.id);
      case 'saveCandidate':
        return { entry: await saveCandidate(message.candidate) };
      case 'updateCandidate':
        return { entry: await updateCandidate(message.id, message.candidate) };
      default:
        throw new Error(`Unknown message: ${message.type}`);
    }
  })()
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message || 'Request failed.' }));

  return true;
});
