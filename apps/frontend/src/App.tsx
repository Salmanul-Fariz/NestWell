import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ThemeProvider, useTheme, type Theme } from './lib/theme-context';
import { NestwellLogo } from './components/shared/NestwellLogo';
import { AppLockScreen } from './components/shared/AppLockScreen';
import { AuthPage } from './modules/auth/AuthPage';
import { PasswordVaultScreen } from './modules/vault/PasswordVaultScreen';
import { EventsScreen } from './modules/events/EventsScreen';
import { CashflowScreen } from './modules/finance/CashflowScreen';
import { EmiScreen } from './modules/finance/EmiScreen';
import { LendBorrowScreen } from './modules/finance/LendBorrowScreen';
import { ReportsScreen } from './modules/finance/ReportsScreen';
import {
  Loader2,
  LogOut,
  KeyRound,
  Calendar,
  DollarSign,
  Users,
  CreditCard,
  PieChart,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
  Lock,
} from 'lucide-react';

const DashboardShell: React.FC = () => {
  const { user, logout, lockApp } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'reports' | 'cashflow' | 'emi' | 'lend' | 'vault' | 'events'>('reports');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationTabs = [
    { id: 'reports', label: 'Financial Dashboard', icon: PieChart, desc: 'Overview & Analytics' },
    { id: 'cashflow', label: 'Income & Expense', icon: DollarSign, desc: 'Cashflow Ledger' },
    { id: 'emi', label: 'EMI & Loans', icon: CreditCard, desc: 'Amortization' },
    { id: 'lend', label: 'Lend & Borrow', icon: Users, desc: 'Party Balances' },
    { id: 'vault', label: 'Password Vault', icon: KeyRound, desc: 'Zero-Knowledge' },
    { id: 'events', label: 'Events & Calendar', icon: Calendar, desc: 'Reminders & Sync' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070913] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 md:hidden text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <NestwellLogo size={36} />
            <div>
              <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Nestwell
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20 uppercase tracking-wide">
                  PRO
                </span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400 block -mt-0.5">
                Life Operations Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Lock Application Button */}
            <button
              onClick={lockApp}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Lock Entire Application"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock App</span>
            </button>

            {/* Theme Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {(['dark', 'light', 'system'] as Theme[]).map((mode) => {
                const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Laptop;
                const isActive = theme === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setTheme(mode)}
                    className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{user?.email}</p>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 transition-all flex items-center gap-2 text-xs font-medium cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Dynamic Navigation Sub-bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 hidden md:flex gap-1.5 overflow-x-auto no-scrollbar py-2 border-t border-slate-100 dark:border-slate-800/60">
          {navigationTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'text-indigo-600 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mainSubNavPill"
                    className="absolute inset-0 bg-indigo-50 dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-slate-800 shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-1"
            >
              {navigationTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ReportsScreen />
            </motion.div>
          )}

          {activeTab === 'cashflow' && (
            <motion.div
              key="cashflow"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CashflowScreen />
            </motion.div>
          )}

          {activeTab === 'emi' && (
            <motion.div
              key="emi"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <EmiScreen />
            </motion.div>
          )}

          {activeTab === 'lend' && (
            <motion.div
              key="lend"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <LendBorrowScreen />
            </motion.div>
          )}

          {activeTab === 'vault' && (
            <motion.div
              key="vault"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <PasswordVaultScreen />
            </motion.div>
          )}

          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <EventsScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const RootApp: React.FC = () => {
  const { user, loading, isAppLocked } = useAuth();

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
      {!user ? (
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
      ) : isAppLocked ? (
        <motion.div
          key="lock"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="min-h-screen"
        >
          <AppLockScreen />
        </motion.div>
      ) : (
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
