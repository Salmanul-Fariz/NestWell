import { api } from './api';

export interface NotificationSettings {
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappPhone: string;
  hasWhatsappApiKey: boolean;
  devices: Array<{ endpoint: string; label: string; createdAt: string }>;
  pushConfigured: boolean;
  whatsappConfigured: boolean;
  vapidPublicKey: string;
}

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/** VAPID keys travel as base64url but PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/**
 * The endpoint identifying this browser's subscription, or null if it has none.
 * Push subscriptions live in the browser, so a server-side "enabled" flag alone
 * cannot tell us whether *this* device will actually receive anything.
 */
export async function getCurrentEndpoint(): Promise<string | null> {
  if (!pushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    return subscription?.endpoint ?? null;
  } catch {
    return null;
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!pushSupported()) {
    throw new Error('This browser does not support push notifications.');
  }
  return navigator.serviceWorker.register('/sw.js');
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser';
  const platform = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return platform ? `${browser} on ${platform}` : browser;
}

export async function enablePush(vapidPublicKey: string): Promise<NotificationSettings> {
  if (!vapidPublicKey) {
    throw new Error('The server has no VAPID public key configured.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked for this site. Allow them in your browser settings and retry.'
        : 'Notification permission was dismissed.',
    );
  }

  const registration = await registerServiceWorker();
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const json = subscription.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  const res = await api.post<NotificationSettings>('/notifications/push/subscribe', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    label: deviceLabel(),
  });

  return res.data;
}

export async function disablePush(): Promise<NotificationSettings | null> {
  if (!pushSupported()) return null;

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const res = await api.post<NotificationSettings>('/notifications/push/unsubscribe', {
    endpoint,
  });
  return res.data;
}
