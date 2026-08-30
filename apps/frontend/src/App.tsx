import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ThemeProvider, useTheme, type Theme } from './lib/theme-context';
import { AuthPage } from './modules/auth/AuthPage';
import {
  Loader2,
  ShieldCheck,
  LogOut,
  KeyRound,
  Calendar,
  DollarSign,
  Users,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';

const DashboardShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070913] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Nestwell
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 block -mt-1">
                Life Management
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Icon-Only Theme Switcher (Dark / Light / System) */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {(['dark', 'light', 'system'] as Theme[]).map((mode) => {
                const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Laptop;
                const isActive = theme === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setTheme(mode)}
                    className={`p-1.5 rounded-lg text-xs transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                    title={`Switch to ${mode} mode`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-slate-900 dark:text-white">{user?.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 transition-all flex items-center gap-2 text-xs font-medium"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {user?.name} 👋
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            All your credentials, calendar schedules, and finances organized in one place.
          </p>
        </div>

        {/* Quick Module Status Cards with original colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/40 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Password Vault</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Client-side encrypted credential store</p>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 hover:border-violet-500/40 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Events & Calendar</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Recurring events & multi-offset reminders</p>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/40 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Income & Expense</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cashflow tracking & recurring generation</p>
          </div>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 hover:border-amber-500/40 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Lend & Borrow</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Per-party balance & append-only settlement</p>
          </div>
        </div>
      </main>
    </div>
  );
};

const RootApp: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#070913] text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-xs text-slate-500 tracking-wider uppercase font-medium">
          Loading Nestwell...
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {user ? (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen"
        >
          <DashboardShell />
        </motion.div>
      ) : (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen"
        >
          <AuthPage />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
