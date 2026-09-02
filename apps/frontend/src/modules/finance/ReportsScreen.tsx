import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { apiErrorMessage } from '../../lib/utils';
import { formatConstantLabel } from '@nestwell/shared-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Users,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#F59E0B',
  travel: '#3B82F6',
  rent: '#EF4444',
  utilities: '#10B981',
  shopping: '#EC4899',
  entertainment: '#8B5CF6',
  health: '#14B8A6',
  education: '#6366F1',
  subscriptions: '#F43F5E',
  other: '#64748B',
  lend: '#0EA5E9',
  borrow: '#F97316',
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  return [current - 2, current - 1, current, current + 1];
})();

const money = (value: number) =>
  `${value < 0 ? '-₹' : '₹'}${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

interface ReportPayload {
  totalIncome: number;
  totalExpense: number;
  monthSavings: number;
  netLendBalance: number;
  netBorrowBalance: number;
  totalLendGiven?: number;
  totalBorrowReceived?: number;
  totalRepaymentsReceived?: number;
  totalRepaymentsPaid?: number;
  periodLendOut?: number;
  periodBorrowIn?: number;
  periodPartyCashFlow?: number;
  netSavings: number;
  expensesByCategory?: Array<{ _id: string; totalAmount: number }>;
  weeks?: Array<{
    week: number;
    income: number;
    expense: number;
    lend: number;
    borrow: number;
    transactions: number;
    outflow: number;
    net: number;
  }>;
  months?: Array<{
    month: number;
    income: number;
    expense: number;
    lend: number;
    borrow: number;
    transactions: number;
    outflow: number;
    netSavings: number;
  }>;
}

export const ReportsScreen: React.FC = () => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyReport, setMonthlyReport] = useState<ReportPayload | null>(null);
  const [yearlyReport, setYearlyReport] = useState<ReportPayload | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'monthly') {
        const repRes = await api.get<ReportPayload>('/finance/reports/monthly', {
          params: { month: selectedMonth, year: selectedYear },
        });
        setMonthlyReport(repRes.data);
      } else {
        const repRes = await api.get<ReportPayload>('/finance/reports/yearly', {
          params: { year: selectedYear },
        });
        setYearlyReport(repRes.data);
      }
    } catch (err) {
      console.error('Failed to load financial reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [viewMode, selectedMonth, selectedYear]);

  const report = viewMode === 'monthly' ? monthlyReport : yearlyReport;
  const totalIncome = report?.totalIncome || 0;
  const totalExpense = report?.totalExpense || 0;
  const periodPartyCashFlow = report?.periodPartyCashFlow || 0;
  const monthSavings =
    report?.monthSavings ?? totalIncome - totalExpense + periodPartyCashFlow;
  const netLendBalance = report?.netLendBalance || 0;
  const netBorrowBalance = report?.netBorrowBalance || 0;
  const savingsRate = totalIncome > 0 ? Math.round((monthSavings / totalIncome) * 100) : 0;
  const periodLabel =
    viewMode === 'monthly' ? `${FULL_MONTHS[selectedMonth - 1]} ${selectedYear}` : String(selectedYear);

  const pieData = useMemo(() => {
    const source = report?.expensesByCategory ?? [];
    const slices = source.map((item) => {
      const catKey = (item._id || 'other').toString().toLowerCase();
      return {
        name: formatConstantLabel(item._id || 'OTHER'),
        value: item.totalAmount,
        color: CATEGORY_COLORS[catKey] || '#6366F1',
      };
    });
    if ((report?.periodLendOut || 0) > 0) {
      slices.push({ name: 'Lent out', value: report!.periodLendOut!, color: CATEGORY_COLORS.lend });
    }
    if ((report?.periodBorrowIn || 0) > 0) {
      slices.push({ name: 'Borrowed in', value: report!.periodBorrowIn!, color: CATEGORY_COLORS.borrow });
    }
    return slices;
  }, [report]);

  const yearlyChartData = useMemo(() => {
    if (!yearlyReport?.months) return [];
    return yearlyReport.months.map((m) => ({
      name: MONTH_NAMES[m.month - 1],
      income: m.income,
      expense: m.expense,
      lend: m.lend,
      borrow: m.borrow,
      transactions: m.transactions,
      outflow: m.outflow,
      net: m.netSavings,
    }));
  }, [yearlyReport]);

  const monthlyTrendData = useMemo(() => {
    if (!monthlyReport?.weeks?.length) return [];
    return monthlyReport.weeks.map((w) => ({
      name: `Week ${w.week}`,
      income: w.income,
      expense: w.expense,
      lend: w.lend,
      borrow: w.borrow,
      transactions: w.transactions,
      outflow: w.outflow,
      net: w.net,
    }));
  }, [monthlyReport]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <PieIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Savings, income, expenses, and outstanding lend/borrow for {periodLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Monthly View
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'yearly'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Yearly View
            </button>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === 'monthly' && (
              <div className="w-36">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(val) => setSelectedMonth(parseInt(val, 10))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FULL_MONTHS.map((m, idx) => (
                      <SelectItem key={m} value={(idx + 1).toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="w-28">
              <Select
                value={selectedYear.toString()}
                onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Core Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* This Month's Savings */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {viewMode === 'monthly' ? `${FULL_MONTHS[selectedMonth - 1]} savings` : `${selectedYear} savings`}
            </span>
            <div className={`w-8 h-8 rounded-lg ${monthSavings >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'} flex items-center justify-center`}>
              {monthSavings >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <h3 className={`text-2xl font-extrabold font-mono ${monthSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {money(monthSavings)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Income − expenses, plus lend, borrow, and settlements
            {totalIncome > 0 ? ` · ${savingsRate}% of income` : ''}
          </p>
        </motion.div>

        {/* 3. Net Lend Balance */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Owed to you</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold font-mono text-sky-600 dark:text-sky-400">
            {money(netLendBalance)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Outstanding lend balance (all parties)
          </p>
        </motion.div>

        {/* 4. Net Borrow Balance */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">You owe</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {money(netBorrowBalance)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Outstanding borrow balance (all parties)
          </p>
        </motion.div>
      </div>

      {/* Period Income & Expense Breakdown Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Total Income</span>
              <h4 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                {money(totalIncome)}
              </h4>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            In {periodLabel}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Total Expense</span>
              <h4 className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                {money(totalExpense)}
              </h4>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
            Spent in {periodLabel}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <span className="text-xs font-medium">Loading dashboard...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="mb-4">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                {viewMode === 'monthly' ? `${periodLabel} cashflow` : `${selectedYear} cashflow`}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Income, expenses, money lent out, and money borrowed in
              </p>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'monthly' ? (
                  <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="lendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="borrowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val) => money(Number(val ?? 0))}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#fff',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#incomeGrad)" />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#F43F5E" strokeWidth={2.5} fillOpacity={1} fill="url(#expenseGrad)" />
                    <Area type="monotone" dataKey="lend" name="Lent out" stroke="#0EA5E9" strokeWidth={2.5} fillOpacity={1} fill="url(#lendGrad)" />
                    <Area type="monotone" dataKey="borrow" name="Borrowed in" stroke="#F97316" strokeWidth={2.5} fillOpacity={1} fill="url(#borrowGrad)" />
                  </AreaChart>
                ) : (
                  <BarChart data={yearlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val) => money(Number(val ?? 0))}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#fff',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lend" name="Lent out" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="borrow" name="Borrowed in" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Spending & party cash</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Expense categories plus lend and borrow in {periodLabel}
              </p>
            </div>

            {pieData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No expenses, lend, or borrow recorded for this period.
              </div>
            ) : (
              <div className="h-[240px] w-full my-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => money(Number(val ?? 0))}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#fff',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
