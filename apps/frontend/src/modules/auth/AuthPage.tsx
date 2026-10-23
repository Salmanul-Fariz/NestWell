import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/auth-context';
import { useTheme, type Theme } from '../../lib/theme-context';
import { THEME_CONFIG } from '../../lib/theme-constants';
import { NestwellLogo } from '../../components/shared/NestwellLogo';
import { apiErrorMessage } from '../../lib/utils';
import {
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  KeyRound,
  Calendar,
  DollarSign,
  CheckCircle2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Laptop,
  UserRound,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isSigningUp) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(
        apiErrorMessage(
          err,
          isSigningUp
            ? 'Unable to create your account. Please try again.'
            : 'Incorrect credentials or connection error. Please try again.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const featurePills = [
    { icon: KeyRound, title: 'Encrypted Vault', desc: 'Zero-knowledge master key', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    { icon: Calendar, title: 'Smart Calendar', desc: 'Multi-channel event alerts', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
    { icon: DollarSign, title: 'Cashflow Ledger', desc: 'Income, expenses & settlements', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
  ];

  return (
    <div className={`min-h-screen w-full flex items-center justify-center relative overflow-hidden px-4 py-8 sm:py-12 ${THEME_CONFIG.surfaces.body}`}>
      {/* Top Floating Theme Switcher (Dark / Light / System) */}
      <div className="fixed top-5 right-5 z-50 flex items-center p-1 rounded-2xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-black/5">
        {(['dark', 'light', 'system'] as Theme[]).map((mode) => {
          const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Laptop;
          const isActive = theme === mode;
          return (
            <button
              key={mode}
              onClick={() => setTheme(mode)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
              title={`Switch to ${mode} mode`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="capitalize hidden sm:inline">{mode}</span>
            </button>
          );
        })}
      </div>

      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute -top-32 -left-32 w-[32rem] h-[32rem] bg-indigo-600/15 dark:bg-indigo-600/20 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute top-1/3 -right-32 w-[36rem] h-[36rem] bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '-3s' }} />
        <div className="absolute -bottom-32 left-1/4 w-[28rem] h-[28rem] bg-cyan-600/10 dark:bg-cyan-600/15 rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '-6s' }} />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Side: Brand Intro */}
        <motion.div 
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left"
        >
          <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold backdrop-blur-md">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span>Personal Life Operating System</span>
          </div>

          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white flex flex-col">
              <span>One place for</span>
              <span className="text-indigo-600 dark:text-indigo-400">your digital privacy.</span>
            </h1>
            <p className="text-base sm:text-lg mt-3 max-w-md font-normal leading-relaxed text-slate-600 dark:text-slate-400">
              Encrypted credentials, multi-schedule calendar reminders, and personal cashflow ledger under your complete control.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {featurePills.map((pill, idx) => {
              const Icon = pill.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ y: -4 }}
                  className={`p-3.5 rounded-2xl border ${pill.color} backdrop-blur-md transition-all shadow-sm`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{pill.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{pill.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Right Side: Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 w-full max-w-md mx-auto"
        >
          <div className={`rounded-3xl p-5 sm:p-9 relative overflow-hidden shadow-2xl ${THEME_CONFIG.surfaces.card}`}>
            <div className="flex items-center justify-between mb-7">
              <div className="flex items-center gap-3">
                <NestwellLogo size={44} />
                <div>
                  <h2 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Nestwell</h2>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Secure Access Portal</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">
                AES-256
              </span>
            </div>

            <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              {isSigningUp ? (
                <UserRound className="w-4 h-4 text-indigo-500" />
              ) : (
                <Lock className="w-4 h-4 text-indigo-500" />
              )}
              {isSigningUp ? 'Create your account' : 'Sign in to your workspace'}
            </div>

            {/* Error banner */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-start gap-2.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0 animate-ping" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form with clean correct placeholders */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSigningUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <UserRound className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${THEME_CONFIG.surfaces.input}`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${THEME_CONFIG.surfaces.input}`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {!isSigningUp && (
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                      Forgot password?
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={isSigningUp ? 6 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isSigningUp ? 'Create a password (at least 6 characters)' : 'Enter your password'}
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-all focus:outline-none ${THEME_CONFIG.surfaces.input}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  <>
                    <span>{isSigningUp ? 'Create Account' : 'Sign In to Workspace'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </motion.button>
            </form>

            <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              {isSigningUp ? 'Already have an account?' : 'New to Nestwell?'}{' '}
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setIsSigningUp(!isSigningUp);
                  setError(null);
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 disabled:opacity-50"
              >
                {isSigningUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zero external trackers · Client-side encryption</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
