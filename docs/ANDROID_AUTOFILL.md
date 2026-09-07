# NestWell Android Autofill

Native Android companion for NestWell password autofill in Chrome and Android applications.

## Important

The current repository does not contain an Android app. Android Autofill must be a separate Kotlin Android Studio project.

Recommended location:

```text
apps/android/
```

A React website, PWA, or Chrome desktop extension cannot register as an Android Autofill provider.

## Goal

The Android app should:

- Sign in to NestWell
- Store a device unlock key securely
- Register an Android `AutofillService`
- Match website domains and Android application packages
- Show matching NestWell credentials
- Require biometric or device unlock
- Return username and password to the requesting form
- Lock after inactivity
- Clear decrypted passwords from memory when locked

## Recommended Project

Use:

- Android Studio
- Kotlin
- Minimum Android API level 26 or newer
- AndroidX
- Kotlin coroutines
- Retrofit or another HTTPS HTTP client
- Android Keystore
- BiometricPrompt

Suggested structure:

```text
apps/android/
  app/src/main/java/com/nestwell/android/
    MainActivity.kt
    auth/AuthRepository.kt
    vault/VaultRepository.kt
    vault/VaultEntry.kt
    security/DeviceKeyStore.kt
    security/BiometricUnlock.kt
    autofill/NestwellAutofillService.kt
  app/src/main/res/xml/
    autofill_service.xml
  app/src/main/AndroidManifest.xml
```

## Backend Configuration

The Android app calls the existing NestWell API:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/vault
POST /api/v1/vault/:id/reveal
```

Login request:

```json
{
  "email": "name@example.com",
  "password": "your NestWell password"
}
```

Reveal request:

```json
{
  "expiresInSeconds": 30
}
```

Use HTTPS outside local development. Do not send passwords to a non-HTTPS production server.

The backend accepts bearer authentication, so the Android app can use the `accessToken` returned by login and refresh with the `refreshToken`.

## Android Autofill Service

Register a service in `AndroidManifest.xml`:

```xml
<service
    android:name=".autofill.NestwellAutofillService"
    android:label="NestWell"
    android:permission="android.permission.BIND_AUTOFILL_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.autofill.AutofillService" />
    </intent-filter>
    <meta-data
        android:name="android.autofill"
        android:resource="@xml/autofill_service" />
</service>
```

Create `res/xml/autofill_service.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<autofill-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:settingsActivity=".MainActivity" />
```

The service receives an `AssistStructure`. It should:

1. Inspect the focused form.
2. Identify username and password fields.
3. Read the website domain from the structure when available.
4. Read the Android package name for application forms.
5. Ask the user to unlock NestWell.
6. Find exact matching vault entries.
7. Build an `android.service.autofill.Dataset`.
8. Return username and password values.

Do not fill a credential when the domain or package does not match.

## Domain Matching

Use exact matching by default:

```text
https://github.com       matches https://github.com
https://github.com       does not match https://login.github.com
https://example.com      does not match https://example.net
```

For Android applications, maintain a separate trusted mapping:

```text
com.example.app -> https://example.com
```

Do not infer trust from the application display name alone.

## Secure Unlock Design

Do not store the NestWell password in SharedPreferences.

Recommended flow:

1. User signs in once.
2. Generate a random device key.
3. Store the device key in Android Keystore.
4. Store only encrypted session material in app storage.
5. Require `BiometricPrompt` before accessing vault credentials.
6. Keep decrypted passwords in memory only.
7. Clear memory values after fill, lock, timeout, or app backgrounding.
8. Lock after a short inactivity period, such as 5 minutes.
9. Logout removes tokens and the device session.

Android Keystore protects the device key. It does not replace server authentication or domain validation.

## Main App Screens

Minimal first version:

1. Sign in screen
2. Vault status screen
3. Unlock/biometric prompt
4. Autofill provider setup instructions
5. Logout button
6. API server configuration for local testing

The Android app does not need to duplicate the entire web vault UI initially. It only needs secure unlock, credential matching, and provider settings.

## Enable on Phone

After installing the debug APK:

```text
Android Settings
-> Passwords, passkeys and autofill
-> Autofill service
-> Select NestWell
```

The exact menu label can differ by Android manufacturer and version.

Accept the system warning and select NestWell as the active Autofill service.

## Local Android Testing

### Backend

1. Start the local backend:

   ```bash
   pnpm dev
   ```

2. Confirm the backend is reachable from the phone.
3. Do not use `localhost` in the Android app when the backend runs on your development computer. On a physical phone, use the computer's LAN IP, for example:

   ```text
   http://192.168.1.20:3000/api/v1
   ```

4. Ensure the phone and computer are on the same network.
5. Allow the backend port through the development firewall.
6. Use HTTPS for real credentials. Plain HTTP is for local development only.

### Android Studio

1. Open the Android project.
2. Connect a phone with USB debugging enabled, or start an emulator.
3. Run the debug app.
4. Sign in to NestWell.
5. Enable NestWell under Android Autofill settings.
6. Open Chrome on the phone.
7. Visit a website with a saved NestWell credential.
8. Focus the username or password field.
9. Select NestWell from the autofill suggestion.
10. Complete biometric unlock.
11. Confirm the matching username and password are inserted.

## Android Test Checklist

- Login succeeds with the correct API URL.
- Wrong credentials fail without storing the password.
- Access-token refresh works.
- Autofill service appears in Android settings.
- Biometric unlock is required before filling.
- Correct website domain returns a credential.
- Wrong website domain returns no credential.
- Correct Android package returns a credential.
- Unknown package returns no credential.
- Multiple accounts show separate choices.
- Device restart requires the configured unlock flow.
- Logout clears the session.
- Inactivity locks the provider.
- Passwords are not written to logs.
- Passwords are not stored as plaintext in preferences.

## Common Problems

### NestWell does not appear in Autofill settings

Check the service declaration, permission, intent filter, metadata XML, and installed package. Reinstall the debug APK after manifest changes.

### Phone cannot reach the backend

Do not use `localhost`. Use the development computer's LAN IP and confirm the port is reachable from the phone.

### Autofill shows no credential

Check exact domain matching, saved vault URL, active provider selection, and whether the form exposes standard username/password fields.

### Chrome fills nothing

Some pages use custom fields or embedded frames. Start with a standard HTML login form and add site-specific handling only when necessary.

## Recommended Build Order

1. Android login and API client.
2. Vault list and exact matching.
3. Device key and biometric unlock.
4. Basic `AutofillService` for Chrome websites.
5. Android application package matching.
6. Save-new-password workflow.
7. Lock timeout and security testing.
8. Signed release build.
