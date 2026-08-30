export const THEME_CONFIG = {
  colors: {
    primary: {
      gradient: 'from-indigo-600 to-violet-600',
      gradientHover: 'hover:from-indigo-500 hover:to-violet-500',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-500/20 dark:border-indigo-500/30',
      bgLight: 'bg-indigo-50 dark:bg-indigo-500/10',
      glow: 'shadow-indigo-500/25',
    },
    emerald: {
      gradient: 'from-emerald-600 to-teal-600',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      bgLight: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    amber: {
      gradient: 'from-amber-500 to-orange-500',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      bgLight: 'bg-amber-50 dark:bg-amber-500/10',
    },
    violet: {
      gradient: 'from-violet-600 to-purple-600',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-500/20 dark:border-violet-500/30',
      bgLight: 'bg-violet-50 dark:bg-violet-500/10',
    },
  },
  surfaces: {
    card: 'bg-white dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl',
    cardHover: 'hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300',
    input: 'bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-500/60 focus:bg-white dark:focus:bg-slate-900',
    header: 'bg-white/80 dark:bg-[#060813]/85 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-2xl',
    body: 'bg-[#f8fafc] dark:bg-[#04060f] text-slate-900 dark:text-slate-100',
    subtext: 'text-slate-500 dark:text-slate-400',
    heading: 'text-slate-900 dark:text-white',
  },
} as const;
