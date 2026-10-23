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
import { SprintTrackingScreen } from './modules/sprint/SprintTrackingScreen';
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
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';

type AppTab = 'reports' | 'sprint' | 'cashflow' | 'lend' | 'vault' | 'events' | 'settings';

const navigationGroups: Array<{
  label: string;
  items: Array<{ id: AppTab; path: string; label: string; icon: LucideIcon }>;
}> = [
  {
    label: 'Overview',
    items: [
      { id: 'reports', path: '/dashboard', label: 'Dashboard', icon: PieChart },
      { id: 'sprint', path: '/sprint', label: 'Sprint', icon: Target },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'cashflow', path: '/cashflow', label: 'Cashflow', icon: DollarSign },
      { id: 'lend', path: '/lend-borrow', label: 'Lend & Borrow', icon: Users },
    ],
  },
  {
    label: 'Personal',
    items: [
      { id: 'vault', path: '/vault', label: 'Vault', icon: KeyRound },
      { id: 'events', path: '/events', label: 'Events', icon: Calendar },
    ],
  },
  {
    label: 'Settings',
    items: [{ id: 'settings', path: '/notifications', label: 'Notifications', icon: Bell }],
  },
];
const navigationTabs = navigationGroups.flatMap((group) => group.items);

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
  const [compactThemeMenuOpen, setCompactThemeMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('nestwell_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const syncRoute = () => {
      const tab = tabForPath(window.location.pathname);
      if (tab) {
        setActiveTab(tab);
        setMobileMenuOpen(false);
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

  const setSidebarCollapsedState = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try {
      localStorage.setItem('nestwell_sidebar_collapsed', String(collapsed));
    } catch {
      // The current session still works when storage is unavailable.
    }
  };

  const renderThemeSwitcher = (compact = false, showCompactLabel = false) => {
    const options: Array<{ mode: Theme; label: string; icon: LucideIcon }> = [
      { mode: 'light', label: 'Light', icon: Sun },
      { mode: 'dark', label: 'Dark', icon: Moon },
      { mode: 'system', label: 'System', icon: Laptop },
    ];
    const activeIndex = Math.max(options.findIndex((option) => option.mode === theme), 0);

    if (compact) {
      const activeTheme = options[activeIndex];
      const Icon = activeTheme.icon;
      return (
        <div className="relative">
          <button
            type="button"
            onClick={() => setCompactThemeMenuOpen((open) => !open)}
            aria-label="Change color theme"
            aria-expanded={compactThemeMenuOpen}
            aria-haspopup="true"
            className={`flex h-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300 ${showCompactLabel ? 'w-auto gap-2 px-2.5' : 'w-9'}`}
          >
            <Icon className="h-4 w-4" />
            {showCompactLabel && <span className="text-xs font-medium">{activeTheme.label}</span>}
          </button>
          {compactThemeMenuOpen && (
            <div
              role="group"
              aria-label="Choose color theme"
              className={`absolute z-50 min-w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900 ${showCompactLabel ? 'right-0 top-full mt-2' : 'bottom-full left-0 mb-2'}`}
            >
              {options.map(({ mode, label, icon: ThemeIcon }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setTheme(mode);
                    setCompactThemeMenuOpen(false);
                  }}
                  aria-pressed={theme === mode}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                    theme === mode
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <ThemeIcon className="h-4 w-4" />
                  <span>{label}</span>
                  {theme === mode && <span className="ml-auto text-[10px]">Active</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div role="group" aria-label="Color theme" className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/80">
        {options.map(({ mode, label, icon: Icon }) => {
          const isActive = theme === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              aria-label={`${label} theme`}
              aria-pressed={isActive}
              title={`${label} theme`}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-medium transition ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-indigo-300 dark:ring-slate-700'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const toggleSidebar = () => setSidebarCollapsedState(!sidebarCollapsed);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 transition-colors selection:bg-indigo-500 selection:text-white dark:bg-[#070913] dark:text-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-xl transition-[width] duration-200 dark:border-slate-800/80 dark:bg-slate-950/95 xl:flex ${sidebarCollapsed ? 'w-[76px]' : 'w-[272px]'}`}>
        <div className={`flex h-[76px] shrink-0 items-center border-b border-slate-100 dark:border-slate-800/80 ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-5'}`}>
          <NestwellLogo size={36} />
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-bold tracking-tight text-slate-900 dark:text-white">Nestwell</p>
              <p className="text-[11px] text-slate-400">Personal workspace</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {sidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="mx-auto mt-3 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        <nav className={`flex-1 space-y-6 overflow-y-auto py-5 ${sidebarCollapsed ? 'px-2' : 'px-4'}`} aria-label="Main navigation">
          {navigationGroups.map((group) => (
            <section key={group.label} aria-label={`${group.label} navigation`} title={sidebarCollapsed ? group.label : undefined}>
              {!sidebarCollapsed && (
                <h2 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{group.label}</h2>
              )}
              <div className={`space-y-1 ${sidebarCollapsed ? 'border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800' : ''}`}>
                {group.items.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <a
                      key={tab.id}
                      href={tab.path}
                      onClick={(event) => handleNavigation(event, tab.id)}
                      aria-current={isActive ? 'page' : undefined}
                      title={sidebarCollapsed ? `${group.label}: ${tab.label}` : undefined}
                      className={`flex items-center rounded-xl text-[13px] font-medium transition ${
                        sidebarCollapsed ? 'h-11 justify-center px-0' : 'gap-3 px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/20'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Icon className={`h-[17px] w-[17px] ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                      {!sidebarCollapsed && <span>{tab.label}</span>}
                      {isActive && !sidebarCollapsed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className={`shrink-0 border-t border-slate-100 dark:border-slate-800/80 ${sidebarCollapsed ? 'space-y-3 px-2 py-3' : 'space-y-4 p-4'}`}>
          {renderThemeSwitcher(sidebarCollapsed)}
          <div className={`flex rounded-xl bg-slate-50 dark:bg-slate-900/70 ${sidebarCollapsed ? 'flex-col items-center gap-2 p-2' : 'items-center gap-3 p-3'}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white" title={user?.email}>
              {userInitials(user?.name, user?.email)}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{user?.name}</p>
                <p className="truncate text-[10px] text-slate-400">{user?.email}</p>
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 xl:hidden">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <NestwellLogo size={32} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Nestwell</p>
            <p className="truncate text-[11px] text-slate-500">{navigationTabs.find((tab) => tab.id === activeTab)?.label}</p>
          </div>
          {renderThemeSwitcher(true, true)}
          <button type="button" onClick={logout} className="rounded-xl p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-navigation"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-200 dark:border-slate-800"
            >
              <nav className="grid gap-4 px-4 py-5 sm:grid-cols-2" aria-label="Main navigation">
                {navigationGroups.map((group) => (
                  <section key={group.label} aria-label={`${group.label} navigation`}>
                    <h2 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{group.label}</h2>
                    <div className="space-y-1">
                      {group.items.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <a
                            key={tab.id}
                            href={tab.path}
                            onClick={(event) => handleNavigation(event, tab.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                              isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                          </a>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </nav>
              <div className="border-t border-slate-100 px-6 py-3 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{user?.name}</p>
                <p className="mt-0.5 text-slate-400">{user?.email}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main className={`min-w-0 w-full px-4 py-5 sm:px-6 sm:py-6 xl:px-8 xl:py-8 ${sidebarCollapsed ? 'xl:ml-[76px] xl:w-auto' : 'xl:ml-[272px] xl:w-auto'}`}>
        <div className="mx-auto min-w-0 w-full max-w-[1440px]">
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

          {activeTab === 'sprint' && (
            <motion.div
              key="sprint"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <SprintTrackingScreen />
            </motion.div>
          )}
        </AnimatePresence>
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
