import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ThemeProvider, useTheme, type Theme } from './lib/theme-context';
import { NestwellLogo } from './components/shared/NestwellLogo';
import { AuthPage } from './modules/auth/AuthPage';
import { PasswordVaultScreen } from './modules/vault/PasswordVaultScreen';
import { EventsScreen } from './modules/events/EventsScreen';
import { CashflowScreen } from './modules/finance/CashflowScreen';
import { LendBorrowScreen } from './modules/finance/LendBorrowScreen';
import { ReportsScreen } from './modules/finance/ReportsScreen';
import { SettingsScreen } from './modules/settings/SettingsScreen';
import {
  Loader2,
  LogOut,
  KeyRound,
  Calendar,
  DollarSign,
  Users,
  PieChart,
  Bell,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
} from 'lucide-react';

type AppTab = 'reports' | 'cashflow' | 'lend' | 'vault' | 'events' | 'settings';

const navigationTabs = [
  { id: 'reports', path: '/dashboard', label: 'Dashboard', icon: PieChart },
  { id: 'cashflow', path: '/cashflow', label: 'Cashflow', icon: DollarSign },
  { id: 'lend', path: '/lend-borrow', label: 'Lend & Borrow', icon: Users },
  { id: 'vault', path: '/vault', label: 'Vault', icon: KeyRound },
  { id: 'events', path: '/events', label: 'Events', icon: Calendar },
  { id: 'settings', path: '/notifications', label: 'Notifications', icon: Bell },
] as const;

function tabForPath(pathname: string): AppTab | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return navigationTabs.find((tab) => tab.path === normalizedPath)?.id ?? null;
}

function userInitials(name?: string, email?: string) {
  const source = (name || email || 'N').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const DashboardShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<AppTab>(() => tabForPath(window.location.pathname) ?? 'reports');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const syncRoute = () => {
      const tab = tabForPath(window.location.pathname);
      if (tab) {
        setActiveTab(tab);
      } else {
        window.history.replaceState(null, '', '/dashboard');
        setActiveTab('reports');
      }
    };

    syncRoute();
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  const navigateTo = (tab: AppTab) => {
    const destination = navigationTabs.find((item) => item.id === tab)?.path;
    if (!destination) return;

    if (window.location.pathname !== destination) {
      window.history.pushState(null, '', destination);
    }
    setActiveTab(tab);
  };

  const handleNavigation = (event: React.MouseEvent<HTMLAnchorElement>, tab: AppTab) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateTo(tab);
    setMobileMenuOpen(false);
  };

  const ThemeSwitcher = (
    <div className="flex items-center p-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
      {(['light', 'dark', 'system'] as Theme[]).map((mode) => {
        const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Laptop;
        const isActive = theme === mode;
        return (
          <button
            key={mode}
            onClick={() => setTheme(mode)}
            className={`p-1.5 rounded-md transition-all cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title={`${mode[0].toUpperCase()}${mode.slice(1)} theme`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070913] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white transition-colors">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="md:hidden p-2 -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            <NestwellLogo size={32} />
            <span className="font-bold text-[15px] tracking-tight text-slate-900 dark:text-white">
              Nestwell
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1 mx-auto">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <a
                  key={tab.id}
                  href={tab.path}
                  onClick={(event) => handleNavigation(event, tab.id)}
                  className={`relative px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'text-indigo-700 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-900/80'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mainNavPill"
                      className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/15 rounded-lg border border-indigo-200/70 dark:border-indigo-500/25"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon
                    className={`w-3.5 h-3.5 relative z-10 ${
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="relative z-10">{tab.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 ml-auto md:ml-0 shrink-0">
            {ThemeSwitcher}

            <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-slate-200 dark:border-slate-800">
              <div
                className="w-8 h-8 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center"
                title={user?.email}
              >
                {userInitials(user?.name, user?.email)}
              </div>
              <div className="hidden xl:block leading-tight pr-1 max-w-36">
                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
            >
              <nav className="px-3 py-3 space-y-1">
                {navigationTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <a
                      key={tab.id}
                      href={tab.path}
                      onClick={(event) => handleNavigation(event, tab.id)}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </a>
                  );
                })}
              </nav>
              <div className="px-4 pb-4 pt-1 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                  {userInitials(user?.name, user?.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
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

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsScreen />
            </motion.div>
          )}
        </AnimatePresence>
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
