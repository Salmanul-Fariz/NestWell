import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/auth-context';
import { NestwellLogo } from '../../components/shared/NestwellLogo';
import { FormInput } from '../../components/ui/FormControls';
import { Lock, Unlock, Loader2, LogOut, Shield } from 'lucide-react';

export const AppLockScreen: React.FC = () => {
  const { user, unlockApp, logout } = useAuth();
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setError(null);
    setUnlocking(true);

    const success = await unlockApp(password.trim());
    setUnlocking(false);
    if (!success) {
      setError('Incorrect account password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-[#070913] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center space-y-6"
      >
        <div className="flex justify-center">
          <NestwellLogo size={52} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
            <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Application Locked
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.name}</span>. Enter your password to unlock Nestwell.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4 text-left">
          <FormInput
            type="password"
            required
            autoFocus
            label="Account Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password..."
          />

          <button
            type="submit"
            disabled={unlocking}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer transition-all disabled:opacity-50"
          >
            {unlocking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying & Unlocking...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Unlock Application</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-indigo-500" /> AES-256 Protected
          </span>
          <button
            onClick={logout}
            className="hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  );
};
