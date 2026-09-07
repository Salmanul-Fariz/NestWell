# NestWell Chrome Extension

Personal-use Chrome desktop extension for NestWell password autofill.

## Current Status

Implemented in:

```text
apps/chrome-extension/
```

Current features:

- Manifest V3 extension
- NestWell login modal
- API URL configuration
- Vault search and refresh
- Password show and copy
- 30-second reveal expiry
- Lock/logout
- Access-token refresh
- Exact website-origin matching
- Username/password autofill
- Confirmation before saving a submitted login
- Chrome content script for login fields

The extension currently has no custom toolbar icon configured. Chrome may show its default extension icon.

## Project Files

```text
apps/chrome-extension/
  src/
    manifest.json       Chrome permissions and entry points
    background.js       API, login, refresh, vault, reveal, save operations
    content.js          Detects login forms and fills/saves credentials
    content.css         Autofill panel styles
    popup.html          Extension popup structure
    popup.css           NestWell popup styling
    popup.js            Popup state, search, reveal, copy, login modal
    shared.js           Shared constants and origin helpers
  scripts/
    build.mjs           Copies src to dist
  dist/                 Load this directory in Chrome
```

## API Configuration

Configure the API URL in the backend environment file `apps/backend/.env`:

```env
NESTWELL_API_BASE_URL=http://localhost:3000/api/v1
```

The extension build reads this value from `apps/backend/.env` and generates `dist/config.js`. The popup does not ask for an API URL.

Local development uses:

```text
http://localhost:3000/api/v1
```

The backend must be running and `apps/backend/.env` must contain a permanent key:

```env
VAULT_ENCRYPTION_KEY=your-long-random-secret
```

Do not change this key after saving passwords.

## API Calls

The extension uses bearer tokens returned by login. It does not depend on the web app's HttpOnly cookie session.

```text
POST /auth/login
Body: { email, password }

POST /auth/refresh
Body: { refreshToken }

GET /vault
Authorization: Bearer <accessToken>

POST /vault/:id/reveal
Body: { expiresInSeconds: 30 }
Authorization: Bearer <accessToken>

POST /vault
Body: { title, username?, password, url, category, notes? }
Authorization: Bearer <accessToken>
```

The backend returns `expiresAt` from the reveal endpoint. The popup and autofill flow keep the revealed password only in memory and clear it after expiry or lock.

## Build

From the repository root:

```bash
pnpm build:extension
```

From the extension directory:

```bash
pnpm build
```

Development watcher:

```bash
pnpm dev:extension
```

The watcher rebuilds `apps/chrome-extension/dist/` when source files change.

## Install Locally

1. Start NestWell:

   ```bash
   pnpm dev
   ```

2. Build the extension:

   ```bash
   pnpm build:extension
   ```

3. Open Chrome:

   ```text
   chrome://extensions
   ```

4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select:

   ```text
   apps/chrome-extension/dist/
   ```

7. Pin **NestWell Password Vault** from the puzzle menu.
8. Open the extension and sign in.

After source changes, run the build and click **Reload** on the extension page.

## Test Plan

### Popup

- Logged-out state opens the NestWell login modal.
- Wrong credentials show an error in the modal.
- Successful login loads vault entries.
- Search filters title, username, and URL.
- Show displays a password and countdown.
- Password disappears after 30 seconds.
- Copy works only through a fresh or active reveal.
- Lock clears the session and returns to the login modal.
- Expired access tokens show the login modal after refresh fails.

### Autofill

1. Save a vault entry with an exact URL origin, for example:

   ```text
   http://localhost:5173
   ```

2. Open that origin in Chrome.
3. Focus an email, username, or password field.
4. Select the NestWell credential panel.
5. Confirm the username and password are filled.
6. Submit a test login.
7. Confirm the save prompt appears.
8. Test a different origin and confirm no credential is offered.

### Reloading

Chrome does not automatically reload an installed unpacked extension after a build.

```text
chrome://extensions
-> NestWell Password Vault
-> Reload
```

## Limitations

- Chrome desktop only. Chrome Android does not support this extension.
- Some single-page applications do not dispatch a normal form submit event.
- Some websites use custom login fields that cannot be detected reliably.
- Autofill requires exact origin matching; `https://example.com` and `https://login.example.com` are different origins.
- Browser-internal pages such as `chrome://settings` cannot be modified.
- The extension is not published to the Chrome Web Store.

## Troubleshooting

### Generic extension icon

The current manifest does not configure a custom icon. This is expected after removing the icon configuration.

### Popup says unauthorized

Open the popup and sign in again. If refresh fails, the extension clears its stored tokens.

### No autofill panel

Check that:

- The page uses `http` or `https`.
- The saved vault URL has the same origin.
- The extension is enabled for the site.
- The extension was reloaded after the last build.
- The content script is not blocked by a browser-internal page.

### Extension context invalidated

This happens when Chrome reloads the extension while an old content script is still attached to an open page.

1. Open `chrome://extensions`.
2. Click **Reload** for NestWell.
3. Refresh the website tab with `Ctrl+R` or `Cmd+R`.
4. Try the login form again.

The current extension shows a NestWell refresh card instead of a native browser error dialog when this happens.

### API request fails

Confirm the backend is reachable:

```bash
curl http://localhost:3000/health
```

Expected result: HTTP `200`.
