import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/utils';
import {
  disablePush,
  enablePush,
  getCurrentEndpoint,
  pushSupported,
  type NotificationSettings,
} from '../../lib/push';
import { FormInput } from '../../components/ui/FormControls';
import {
  Bell,
  BellOff,
  Check,
  Loader2,
  MessageCircle,
  Smartphone,
  TriangleAlert,
} from 'lucide-react';

type Feedback = { ok: boolean; text: string } | null;

const FeedbackNote: React.FC<{ feedback: Feedback }> = ({ feedback }) => {
  if (!feedback) return null;
  return (
    <div
      className={`mt-3 p-3 rounded-xl text-xs font-medium border ${
        feedback.ok
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
          : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
      }`}
    >
      {feedback.text}
    </div>
  );
};

export const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [pushBusy, setPushBusy] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<Feedback>(null);
  const [whatsappBusy, setWhatsappBusy] = useState(false);
  const [whatsappFeedback, setWhatsappFeedback] = useState<Feedback>(null);

  const supported = pushSupported();
  const permission =
    typeof Notification !== 'undefined' ? Notification.permission : 'default';

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [res, endpoint] = await Promise.all([
        api.get<NotificationSettings>('/notifications/settings'),
        getCurrentEndpoint(),
      ]);
      setSettings(res.data);
      setCurrentEndpoint(endpoint);
      setPhone(res.data.whatsappPhone || '');
    } catch (err) {
      setPushFeedback({ ok: false, text: apiErrorMessage(err, 'Failed to load settings.') });
    } finally {
      setLoading(false);
    }
  };

  /** Server-side settings survive sign-out; the subscription itself is per browser. */
  const thisDeviceRegistered = Boolean(
    currentEndpoint && settings?.devices.some((d) => d.endpoint === currentEndpoint),
  );

  useEffect(() => {
    loadSettings();
  }, []);

  const handleTogglePush = async () => {
    if (!settings) return;
    setPushBusy(true);
    setPushFeedback(null);
    try {
      if (thisDeviceRegistered) {
        const updated = await disablePush();
        if (updated) setSettings(updated);
        else await loadSettings();
        setCurrentEndpoint(null);
        setPushFeedback({ ok: true, text: 'Notifications turned off for this device.' });
      } else {
        const updated = await enablePush(settings.vapidPublicKey);
        setSettings(updated);
        setCurrentEndpoint(await getCurrentEndpoint());
        setPushFeedback({
          ok: true,
          text: 'This device is registered. Event reminders will arrive on this browser.',
        });
      }
    } catch (err) {
      setPushFeedback({
        ok: false,
        text: err instanceof Error ? err.message : apiErrorMessage(err, 'Could not update push.'),
      });
    } finally {
      setPushBusy(false);
    }
  };

  const saveWhatsapp = async (enable?: boolean) => {
    const res = await api.patch<NotificationSettings>('/notifications/settings', {
      whatsappPhone: phone,
      ...(apiKey.trim() ? { whatsappApiKey: apiKey.trim() } : {}),
      ...(enable === undefined ? {} : { whatsappEnabled: enable }),
    });
    setSettings(res.data);
    setApiKey('');
    return res.data;
  };

  const handleSaveWhatsapp = async (enable?: boolean) => {
    setWhatsappBusy(true);
    setWhatsappFeedback(null);
    try {
      await saveWhatsapp(enable);
      setWhatsappFeedback({ ok: true, text: 'WhatsApp settings saved.' });
    } catch (err) {
      setWhatsappFeedback({ ok: false, text: apiErrorMessage(err, 'Could not save settings.') });
    } finally {
      setWhatsappBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="text-xs font-medium">Loading notification settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
          <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Notifications
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Choose how NestWell sends event reminders and the monthly overview
        </p>
      </div>

      {/* Web push */}
      <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Browser push notifications
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Delivered for event reminders, even when this tab is closed.
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
              thisDeviceRegistered
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
          >
            {thisDeviceRegistered ? 'ON' : 'OFF'}
          </span>
        </div>

        {!supported && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-start gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              This browser does not support web push. On iOS, install the app to your Home
              Screen first.
            </span>
          </div>
        )}

        {supported && !settings?.pushConfigured && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-start gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              The server has no VAPID keys. Set WEB_PUSH_VAPID_PUBLIC and
              WEB_PUSH_VAPID_PRIVATE, then restart the backend.
            </span>
          </div>
        )}

        {permission === 'denied' && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium flex items-start gap-2">
            <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Notifications are blocked for this site in your browser. Allow them in the site
              permissions, then retry.
            </span>
          </div>
        )}

        {!!settings?.devices.length && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Registered devices
            </p>
            {settings.devices.map((device) => (
              <div
                key={device.endpoint}
                className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2"
              >
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{device.label || 'Unknown device'}</span>
                {device.endpoint === currentEndpoint && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    this device
                  </span>
                )}
              </div>
            ))}
            {!thisDeviceRegistered && (
              <p className="text-[11px] text-slate-400 pt-1">
                This browser is not in the list yet — enable it below to receive alerts here.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 mt-5">
          <button
            onClick={handleTogglePush}
            disabled={pushBusy || !supported || !settings?.pushConfigured}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              thisDeviceRegistered
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {pushBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : thisDeviceRegistered ? (
              <BellOff className="w-3.5 h-3.5" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            <span>{thisDeviceRegistered ? 'Turn off on this device' : 'Enable on this device'}</span>
          </button>
        </div>

        <FeedbackNote feedback={pushFeedback} />
      </section>

      {/* WhatsApp */}
      <section className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                WhatsApp alerts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Used for event reminders and the monthly financial overview.
              </p>
            </div>
          </div>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
              settings?.whatsappEnabled
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
            }`}
          >
            {settings?.whatsappEnabled ? 'ON' : 'OFF'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <FormInput
            label="WhatsApp number (international format)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+919876543210"
          />
          <FormInput
            label={
              settings?.hasWhatsappApiKey
                ? 'CallMeBot API key (saved — type to replace)'
                : 'CallMeBot API key (optional)'
            }
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={settings?.hasWhatsappApiKey ? '••••••••' : 'Uses server key if blank'}
          />
        </div>

        <p className="text-[11px] text-slate-400 mt-2">
          To get a key, message "I allow callmebot to send me messages" to +34 694 29 84 96 on
          WhatsApp; the bot replies with your personal API key.
        </p>

        <div className="flex flex-wrap items-center gap-2.5 mt-5">
          <button
            onClick={() => handleSaveWhatsapp()}
            disabled={whatsappBusy}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {whatsappBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Save</span>
          </button>

          <button
            onClick={() => handleSaveWhatsapp(!settings?.whatsappEnabled)}
            disabled={whatsappBusy || (!phone.trim() && !settings?.whatsappEnabled)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {settings?.whatsappEnabled ? 'Turn off alerts' : 'Turn on alerts'}
          </button>
        </div>

        <FeedbackNote feedback={whatsappFeedback} />
      </section>
    </div>
  );
};
