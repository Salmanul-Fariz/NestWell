let panel = null;
let matchedEntries = [];
let lastSubmitted = null;
let sessionLocked = true;
let sessionReady = false;
let resumingSubmit = false;
const VAULT_CATEGORIES = [
  ['PERSONAL', 'Personal'],
  ['WORK', 'Work'],
  ['BANKING', 'Banking'],
  ['SOCIAL', 'Social'],
  ['DEVELOPER', 'Developer'],
  ['ENTERTAINMENT', 'Entertainment'],
  ['SHOPPING', 'Shopping'],
  ['EDUCATION', 'Education'],
  ['OTHER', 'Other'],
];

function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        const messageText = chrome.runtime.lastError.message || '';
        if (messageText.toLowerCase().includes('context invalidated')) {
          return reject(new Error('EXTENSION_CONTEXT_INVALIDATED'));
        }
        return reject(new Error(messageText || 'NestWell is unavailable.'));
      }
      if (!response?.ok) return reject(new Error(response?.error || 'Request failed.'));
      resolve(response);
    });
  });
}

function getPasswordField(form) {
  return form?.querySelector('input[type="password"]') || document.querySelector('input[type="password"]');
}

function getUsernameField(form, passwordField) {
  const fields = Array.from(form?.querySelectorAll('input') || document.querySelectorAll('input'));
  return (
    fields.find(
      (field) =>
        field !== passwordField &&
        ['email', 'text', 'tel'].includes(field.type) &&
        !field.disabled &&
        field.offsetParent !== null,
    ) || null
  );
}

function getLoginContext() {
  const passwordField = getPasswordField(document.activeElement?.form || null);
  if (!passwordField) return null;
  const form = passwordField.form || null;
  return { form, passwordField, usernameField: getUsernameField(form, passwordField) };
}

function closePanel() {
  panel?.remove();
  panel = null;
}

function lockSession() {
  sessionLocked = true;
  closePanel();
}

function createPanel() {
  closePanel();
  panel = document.createElement('div');
  panel.id = 'nestwell-autofill-root';
  document.documentElement.append(panel);
  return panel;
}

function addHeader(container, title, onClose = closePanel) {
  const head = document.createElement('div');
  head.className = 'nw-head';
  const brand = document.createElement('div');
  brand.className = 'nw-brand';
  const mark = document.createElement('span');
  mark.className = 'nw-mark';
  mark.textContent = 'NW';
  const name = document.createElement('span');
  name.textContent = title;
  brand.append(mark, name);
  const close = document.createElement('button');
  close.className = 'nw-close';
  close.textContent = '×';
  close.addEventListener('click', onClose);
  head.append(brand, close);
  container.append(head);
}

function showMessage(title, message, actionLabel = 'Close', onAction = closePanel) {
  const root = createPanel();
  const box = document.createElement('div');
  box.className = 'nw-panel nw-modal';
  addHeader(box, title);
  const copy = document.createElement('p');
  copy.className = 'nw-copy';
  copy.textContent = message;
  const action = document.createElement('button');
  action.className = 'nw-action nw-primary';
  action.textContent = actionLabel;
  action.addEventListener('click', onAction);
  box.append(copy, action);
  root.append(box);
  if (title === 'Password saved' || title === 'Password updated') window.setTimeout(closePanel, 1800);
}

function showError(error) {
  if (error.message === 'EXTENSION_CONTEXT_INVALIDATED') {
    showMessage(
      'NestWell needs a refresh',
      'The extension was updated while this page was open. Refresh this page to reconnect NestWell.',
      'Refresh page',
      () => window.location.reload(),
    );
    return;
  }
  showMessage('NestWell Autofill', error.message || 'Something went wrong.');
}

function showMatches(entries, context) {
  const root = createPanel();
  const box = document.createElement('div');
  box.className = 'nw-panel';
  addHeader(box, 'NestWell Autofill');
  const copy = document.createElement('p');
  copy.className = 'nw-copy';
  const username = context?.usernameField?.value?.trim() || '';
  const hasCurrentAccount =
    username && entries.some((entry) => (entry.username || '').trim().toLowerCase() === username.toLowerCase());
  copy.textContent = entries.length
    ? hasCurrentAccount
      ? `Saved account detected for ${username}.`
      : username
        ? `No saved account for ${username}.`
        : 'Choose a saved credential for this website.'
    : username
      ? `No saved account for ${username}.`
      : 'Enter your username and password to save this login.';
  box.append(copy);

  entries.forEach((entry) => {
    const button = document.createElement('button');
    button.className = 'nw-choice';
    button.textContent = entry.title;
    const username = document.createElement('small');
    username.textContent = entry.username || 'No username saved';
    button.append(username);
    button.addEventListener('click', () => fillEntry(entry));
    box.append(button);
  });

  const action = document.createElement('button');
  action.className = 'nw-action nw-primary nw-add-account';
  action.textContent = hasCurrentAccount
    ? 'Update this account'
    : entries.length
      ? 'Save this account'
      : 'Save this login';
  action.addEventListener('click', () => {
    const context = getLoginContext();
    if (!context) {
      showMessage('NestWell Autofill', 'Enter a username and password before saving this account.');
      return;
    }
    void saveSubmittedLogin(context, hasCurrentAccount ? 'update' : 'add');
  });
  box.append(action);
  root.append(box);
}

async function fillEntry(entry) {
  if (sessionLocked) return;
  const context = getLoginContext();
  if (!context) return;
  try {
    const result = await send({ type: 'reveal', id: entry._id });
    if (context.usernameField && entry.username) {
      setNativeValue(context.usernameField, entry.username);
    }
    setNativeValue(context.passwordField, result.password);
    closePanel();
  } catch (error) {
    showError(error);
  }
}

function setNativeValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(input.constructor.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

async function inspectPage() {
  if (sessionLocked) return;
  const context = getLoginContext();
  if (!context) return;
  try {
    const result = await send({ type: 'getMatches', url: window.location.href });
    matchedEntries = result.entries;
    if (matchedEntries.length || context.usernameField?.value || context.passwordField?.value) {
      showMatches(matchedEntries, context);
    }
  } catch {
    // The extension stays quiet when it is locked or the backend is unavailable.
  }
}

function askToSave(candidate, existingEntries, preferredMode = 'add') {
  return new Promise((resolve) => {
    const root = createPanel();
    const box = document.createElement('div');
    box.className = 'nw-panel nw-modal';
    addHeader(box, 'Save password?', () => {
      closePanel();
      resolve({ accepted: false });
    });
    const copy = document.createElement('p');
    copy.className = 'nw-copy';
    copy.textContent = `Save the login for ${new URL(candidate.url).hostname} to your NestWell vault?`;
    const username = candidate.username.trim().toLowerCase();
    const matchingEntry = existingEntries.find(
      (entry) => (entry.username || '').trim().toLowerCase() === username && username,
    );
    if (existingEntries.length) {
      const accounts = document.createElement('p');
      accounts.className = 'nw-copy nw-existing';
      accounts.textContent = `Saved accounts: ${existingEntries.map((entry) => entry.username || 'No username').join(', ')}`;
      box.append(accounts);
    }
    let saveMode = preferredMode;
    if (matchingEntry) {
      const modeLabel = document.createElement('label');
      modeLabel.className = 'nw-label';
      modeLabel.textContent = 'Save as';
      const mode = document.createElement('select');
      mode.className = 'nw-select';
      const addOption = document.createElement('option');
      addOption.value = 'add';
      addOption.textContent = 'Add another account';
      const updateOption = document.createElement('option');
      updateOption.value = 'update';
      updateOption.textContent = `Update ${matchingEntry.username || 'existing account'}`;
      if (preferredMode === 'update') updateOption.selected = true;
      mode.append(addOption, updateOption);
      mode.addEventListener('change', () => {
        saveMode = mode.value;
      });
      modeLabel.append(mode);
      box.append(modeLabel);
    } else if (existingEntries.length) {
      const note = document.createElement('p');
      note.className = 'nw-copy nw-existing';
      note.textContent = 'This is a different username, so it will be added as another account.';
      box.append(note);
    }
    const categoryLabel = document.createElement('label');
    categoryLabel.className = 'nw-label';
    categoryLabel.textContent = 'Category';
    const category = document.createElement('select');
    category.className = 'nw-select';
    VAULT_CATEGORIES.forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      if (value === 'PERSONAL') option.selected = true;
      category.append(option);
    });
    categoryLabel.append(category);
    const actions = document.createElement('div');
    actions.className = 'nw-actions';
    const cancel = document.createElement('button');
    cancel.className = 'nw-action';
    cancel.textContent = 'Not now';
    cancel.addEventListener('click', () => {
      closePanel();
      resolve({ accepted: false });
    });
    const save = document.createElement('button');
    save.className = 'nw-action nw-primary';
    save.textContent = preferredMode === 'update' && matchingEntry ? 'Update password' : 'Save password';
    save.addEventListener('click', () => {
      candidate.category = category.value;
      closePanel();
      resolve({ accepted: true, mode: saveMode, matchingId: matchingEntry?._id });
    });
    actions.append(cancel, save);
    box.append(copy, categoryLabel, actions);
    root.append(box);
  });
}

async function saveSubmittedLogin(context, preferredMode = 'add') {
  if (sessionLocked) return;
  if (!context?.passwordField?.value || !window.location.href.startsWith('http')) return;
  const username = context.usernameField?.value || '';
  const candidate = {
    title: document.title || window.location.hostname,
    username,
    password: context.passwordField.value,
    url: window.location.href,
  };
  let existingEntries;
  try {
    existingEntries = (await send({ type: 'getMatches', url: candidate.url })).entries;
  } catch (error) {
    showError(error);
    context.resume?.();
    return;
  }
  const saveChoice = await askToSave(candidate, existingEntries, preferredMode);
  if (!saveChoice.accepted) {
    context.resume?.();
    return;
  }
  try {
    if (saveChoice.mode === 'update' && saveChoice.matchingId) {
      await send({ type: 'updateCandidate', id: saveChoice.matchingId, candidate });
      showMessage('Password updated', 'The matching NestWell account was updated.');
    } else {
      await send({ type: 'saveCandidate', candidate });
      showMessage('Password saved', 'This login was added as a separate NestWell account.');
    }
  } catch (error) {
    showError(error);
  } finally {
    context.resume?.();
  }
}

document.addEventListener(
  'focusin',
  (event) => {
    if (sessionReady && event.target.matches?.('input[type="password"], input[type="email"]')) inspectPage();
  },
  true,
);

document.addEventListener(
  'input',
  (event) => {
    if (
      sessionReady &&
      event.target.matches?.('input[type="password"], input[type="email"], input[type="text"], input[type="tel"]')
    ) {
      const context = getLoginContext();
      if (context?.passwordField?.value || context?.usernameField?.value) inspectPage();
    }
  },
  true,
);

document.addEventListener(
  'submit',
  (event) => {
    if (resumingSubmit) {
      resumingSubmit = false;
      return;
    }
    const passwordField = getPasswordField(event.target);
    const context = passwordField
      ? {
          form: event.target,
          passwordField,
          usernameField: getUsernameField(event.target, passwordField),
          submitter: event.submitter,
          resume() {
            resumingSubmit = true;
            if (typeof event.target.requestSubmit === 'function') event.target.requestSubmit(event.submitter);
            else HTMLFormElement.prototype.submit.call(event.target);
          },
        }
      : null;
    if (context && context !== lastSubmitted) {
      lastSubmitted = context;
      event.preventDefault();
      void saveSubmittedLogin(context);
    }
  },
  true,
);

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'sessionLocked') lockSession();
});

send({ type: 'getState' })
  .then((result) => {
    sessionLocked = !result.loggedIn;
    sessionReady = true;
    if (!sessionLocked) inspectPage();
  })
  .catch(() => {
    sessionLocked = true;
    sessionReady = true;
  });
