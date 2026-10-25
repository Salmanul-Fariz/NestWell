const $ = (selector) => document.querySelector(selector);
const state = { entries: [], revealed: new Map(), query: '', activeTab: null };

function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response?.ok) return reject(new Error(response?.error || 'Request failed.'));
      resolve(response);
    });
  });
}

function showStatus(message, isError = false) {
  const status = $('#status');
  status.textContent = message;
  status.classList.toggle('error', isError);
  status.classList.remove('hidden');
}

function clearStatus() {
  $('#status').classList.add('hidden');
}

function showLoginModal(message = 'Unlock your personal password vault.') {
  $('#login-message').textContent = message;
  $('#login-error').classList.add('hidden');
  $('#login-modal').classList.remove('hidden');
  $('#email').focus();
}

function showLoginError(message) {
  $('#login-error').textContent = message;
  $('#login-error').classList.remove('hidden');
}

function showSaveModal() {
  $('#save-error').classList.add('hidden');
  $('#save-form').reset();
  const tabUrl = state.activeTab?.url;
  if (tabUrl && /^https?:\/\//i.test(tabUrl)) {
    const url = new URL(tabUrl);
    $('#save-url').value = url.origin;
    $('#save-title-input').value = url.hostname;
  }
  $('#save-modal').classList.remove('hidden');
  $('#save-title-input').focus();
}

function closeSaveModal() {
  $('#save-password').value = '';
  $('#save-modal').classList.add('hidden');
}

function clearReveal(id) {
  const active = state.revealed.get(id);
  if (active?.timer) window.clearInterval(active.timer);
  state.revealed.delete(id);
  renderEntries();
}

function reveal(id) {
  return send({ type: 'reveal', id }).then((result) => {
    const expiresAt = new Date(result.expiresAt).getTime();
    const active = { password: result.password, expiresAt, timer: null };
    active.timer = window.setInterval(() => {
      if (Date.now() >= expiresAt) clearReveal(id);
      else renderEntries();
    }, 1000);
    state.revealed.set(id, active);
    renderEntries();
  });
}

function createButton(label, onClick, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (className) button.className = className;
  button.addEventListener('click', onClick);
  return button;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.activeTab = tab || null;
}

async function fillOnActiveTab(entry) {
  if (!state.activeTab?.id) {
    showStatus('Could not find the active tab. Refresh the page and try again.', true);
    return;
  }
  try {
    const response = await chrome.tabs.sendMessage(state.activeTab.id, {
      type: 'fillCredential',
      entry,
    });
    if (!response?.ok) throw new Error(response?.error || 'No login form was found on this page.');
    window.close();
  } catch (error) {
    showStatus(
      error.message?.includes('Receiving end does not exist')
        ? 'Refresh this website to enable NestWell autofill.'
        : error.message || 'Could not fill the login on this page.',
      true,
    );
  }
}

function renderEntries() {
  const container = $('#entries');
  container.replaceChildren();
  const query = state.query.trim().toLowerCase();
  const visible = state.entries.filter(
    (entry) =>
      !query ||
      [entry.title, entry.username, entry.url].filter(Boolean).some((value) => value.toLowerCase().includes(query)),
  );

  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = state.entries.length ? 'No matching passwords.' : 'Your vault is empty.';
    container.append(empty);
    return;
  }

  visible.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'entry';

    const head = document.createElement('div');
    head.className = 'entry-head';
    const title = document.createElement('div');
    title.className = 'entry-title';
    title.textContent = entry.title;
    const url = document.createElement('div');
    url.className = 'entry-url';
    url.textContent = entry.url || 'No website URL';
    const identity = document.createElement('div');
    identity.append(title, url);
    head.append(identity);

    const username = document.createElement('div');
    username.className = 'entry-user';
    username.textContent = entry.username || 'No username saved';

    const actions = document.createElement('div');
    actions.className = 'entry-actions';
    const active = state.revealed.get(entry._id);
    const secret = document.createElement('span');
    secret.className = 'secret';
    secret.textContent = active && active.expiresAt > Date.now() ? active.password : '••••••••••••';
    actions.append(secret);

    if (active && active.expiresAt > Date.now()) {
      const countdown = document.createElement('span');
      countdown.className = 'countdown';
      countdown.textContent = `${Math.ceil((active.expiresAt - Date.now()) / 1000)}s`;
      actions.append(countdown);
    }

    actions.append(
      createButton(active ? 'Hide' : 'Show', () => {
        if (active) clearReveal(entry._id);
        else
          reveal(entry._id).catch((error) => {
            if (error.message === 'AUTH_REQUIRED') showLoginModal('Your session expired. Sign in again to continue.');
            else showStatus(error.message, true);
          });
      }),
    );
    actions.append(
      createButton('Copy', async () => {
        try {
          const current = state.revealed.get(entry._id);
          const result =
            current && current.expiresAt > Date.now() ? current : await send({ type: 'reveal', id: entry._id });
          const password = result.password;
          if (!current) {
            const expiresAt = new Date(result.expiresAt).getTime();
            const timer = window.setInterval(() => {
              if (Date.now() >= expiresAt) clearReveal(entry._id);
              else renderEntries();
            }, 1000);
            state.revealed.set(entry._id, { password, expiresAt, timer });
          }
          await navigator.clipboard.writeText(password);
          showStatus('Password copied to your clipboard.');
          renderEntries();
        } catch (error) {
          if (error.message === 'AUTH_REQUIRED') showLoginModal('Your session expired. Sign in again to continue.');
          else showStatus(error.message, true);
        }
      }),
    );
    const isMatchingSite = Boolean(
      state.activeTab?.url &&
      (() => {
        try {
          return new URL(entry.url).origin === new URL(state.activeTab.url).origin;
        } catch {
          return false;
        }
      })(),
    );
    if (isMatchingSite) {
      actions.append(createButton('Fill', () => void fillOnActiveTab(entry), 'action-primary'));
    }

    card.append(head, username, actions);
    container.append(card);
  });
}

async function loadEntries() {
  clearStatus();
  try {
    const result = await send({ type: 'getEntries' });
    state.entries = result.entries;
    renderEntries();
  } catch (error) {
    if (error.message === 'AUTH_REQUIRED') showLoginModal('Your session expired. Sign in again to continue.');
    else showStatus(error.message, true);
  }
}

function showLoggedIn(user) {
  $('#vault-view').classList.remove('hidden');
  $('#login-modal').classList.add('hidden');
  $('#lock-button').classList.remove('hidden');
  $('#footer-status').textContent = user?.email ? `Signed in as ${user.email}` : 'Local extension session';
  loadEntries();
}

function showLoggedOut() {
  $('#vault-view').classList.remove('hidden');
  $('#lock-button').classList.add('hidden');
  $('#footer-status').textContent = 'Local extension session';
  showLoginModal();
}

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  clearStatus();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Signing in…';
  try {
    const result = await send({
      type: 'login',
      email: $('#email').value.trim(),
      password: $('#password').value,
    });
    $('#password').value = '';
    showLoggedIn(result.user);
  } catch (error) {
    showLoginError(error.message === 'AUTH_REQUIRED' ? 'Your session expired. Sign in again to continue.' : error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = 'Sign in <span>→</span>';
  }
});

$('#add-button').addEventListener('click', () => {
  void getActiveTab().then(showSaveModal).catch((error) => showStatus(error.message, true));
});
$('#cancel-save').addEventListener('click', closeSaveModal);
$('#save-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#submit-save');
  button.disabled = true;
  button.textContent = 'Saving…';
  $('#save-error').classList.add('hidden');
  const candidate = {
    url: $('#save-url').value.trim(),
    title: $('#save-title-input').value.trim(),
    username: $('#save-username').value.trim(),
    password: $('#save-password').value,
  };
  try {
    await send({ type: 'saveCandidate', candidate });
    closeSaveModal();
    showStatus('Login saved securely to your NestWell vault.');
    await loadEntries();
  } catch (error) {
    if (error.message === 'AUTH_REQUIRED') {
      closeSaveModal();
      showLoginModal('Your session expired. Sign in again to continue.');
    } else {
      $('#save-error').textContent = error.message || 'Could not save this login.';
      $('#save-error').classList.remove('hidden');
    }
  } finally {
    button.disabled = false;
    button.textContent = 'Save login';
  }
});

$('#search').addEventListener('input', (event) => {
  state.query = event.target.value;
  renderEntries();
});
$('#refresh-button').addEventListener('click', loadEntries);
$('#lock-button').addEventListener('click', async () => {
  try {
    await send({ type: 'logout' });
    state.revealed.forEach((value) => value.timer && window.clearInterval(value.timer));
    state.revealed.clear();
    showLoggedOut();
  } catch (error) {
    showStatus(error.message || 'Could not lock the vault.', true);
  }
});

Promise.all([getActiveTab(), send({ type: 'getState' })])
  .then(([, result]) => {
    if (result.loggedIn) showLoggedIn(result.user);
    else showLoggedOut();
  })
  .catch((error) => {
    showLoggedOut();
    showLoginError(error.message || 'Could not connect to the NestWell extension service.');
  });
