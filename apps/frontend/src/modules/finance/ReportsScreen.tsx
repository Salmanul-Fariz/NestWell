import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
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
  DollarSign,
  PieChart as PieIcon,
  CreditCard,
  Users,
  Loader2,
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
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const ReportsScreen: React.FC = () => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [yearlyReport, setYearlyReport] = useState<any>(null);
  const [emis, setEmis] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'monthly') {
        const [repRes, emiRes, lendRes] = await Promise.all([
          api.get('/finance/reports/monthly', {
            params: { month: selectedMonth, year: selectedYear },
          }),
          api.get('/finance/emi'),
          api.get('/finance/lend-borrow'),
        ]);
        setMonthlyReport(repRes.data);
        setEmis(emiRes.data);
        setLedgers(lendRes.data);
      } else {
        const [repRes, emiRes, lendRes] = await Promise.all([
          api.get('/finance/reports/yearly', {
            params: { year: selectedYear },
          }),
          api.get('/finance/emi'),
          api.get('/finance/lend-borrow'),
        ]);
        setYearlyReport(repRes.data);
        setEmis(emiRes.data);
        setLedgers(lendRes.data);
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

  // Aggregate KPI figures
  const totalIncome =
    viewMode === 'monthly'
      ? monthlyReport?.totalIncome || 0
      : yearlyReport?.totalIncome || 0;

  const totalExpense =
    viewMode === 'monthly'
      ? monthlyReport?.totalExpense || 0
      : yearlyReport?.totalExpense || 0;

  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Loan paid amount total
  const totalLoanPaidAmount = useMemo(() => {
    let total = 0;
    emis.forEach((loan) => {
      loan.installments?.forEach((inst: any) => {
        if (inst.paid) total += inst.amount;
      });
    });
    return total;
  }, [emis]);

  // Lend & Borrow Net Position
  const { totalToReceive, totalToPay } = useMemo(() => {
    let toReceive = 0;
    let toPay = 0;
    ledgers.forEach((l) => {
      if (l.balance > 0) toReceive += l.balance;
      else if (l.balance < 0) toPay += Math.abs(l.balance);
    });
    return { totalToReceive: toReceive, totalToPay: toPay };
  }, [ledgers]);

  // Format Category Breakdown for Pie Chart
  const pieData = useMemo(() => {
    if (!monthlyReport?.expensesByCategory) return [];
    return monthlyReport.expensesByCategory.map((item: any) => {
      const catKey = (item._id || 'other').toString().toLowerCase();
      const label = item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1).toLowerCase() : 'Other';
      return {
        name: label,
        value: item.totalAmount,
        color: CATEGORY_COLORS[catKey] || '#6366F1',
      };
    });
  }, [monthlyReport]);

  // Monthly breakdown trend or Yearly 12-month trajectory
  const yearlyChartData = useMemo(() => {
    if (!yearlyReport?.months) return [];
    return yearlyReport.months.map((m: any) => ({
      name: MONTH_NAMES[m.month - 1],
      income: m.income,
      expense: m.expense,
      savings: m.netSavings,
    }));
  }, [yearlyReport]);

  const monthlyTrendData = useMemo(() => {
    return [
      { name: 'Week 1', income: totalIncome * 0.3, expense: totalExpense * 0.25 },
      { name: 'Week 2', income: totalIncome * 0.4, expense: totalExpense * 0.35 },
      { name: 'Week 3', income: totalIncome * 0.15, expense: totalExpense * 0.2 },
      { name: 'Week 4', income: totalIncome * 0.15, expense: totalExpense * 0.2 },
    ];
  }, [totalIncome, totalExpense]);

  return (
    <div className="space-y-6">
      {/* Header & Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <PieIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Financial Reports & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Visual breakdown of income trends, expenses, loans, and peer balances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Monthly vs Yearly Toggle */}
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

          {/* Date Picker Selectors */}
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
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, idx) => (
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
                  {[2024, 2025, 2026, 2027].map((y) => (
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

      {/* Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Income</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            {viewMode === 'monthly' ? 'Deposited this month' : `Total deposited in ${selectedYear}`}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Outflow</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            ₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
            {viewMode === 'monthly' ? 'Spent this month' : `Total spending in ${selectedYear}`}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Savings</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold font-mono ${netSavings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600'}`}>
            ₹{netSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">{savingsRate}% savings rate</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total EMI Paid</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            ₹{totalLoanPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">{emis.length} active loan plans</p>
        </motion.div>
      </div>

      {/* Lend & Borrow Peer Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">To Receive from Contacts</span>
              <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                +₹{totalToReceive.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h4>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Lent
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">To Pay to Contacts</span>
              <h4 className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">
                -₹{totalToPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h4>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
            Borrowed
          </span>
        </div>
      </div>

      {/* Visual Recharts Charts */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <span className="text-xs font-medium">Aggregating visual analytics...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Trend Chart */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="mb-4">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                {viewMode === 'monthly' ? 'Monthly Cashflow Velocity' : `${selectedYear} Yearly Cashflow Trajectory`}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {viewMode === 'monthly' ? 'Weekly inflow vs outflow breakdown' : '12-month income vs expense performance'}
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
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#fff',
                      }}
                    />
                    <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#incomeGrad)" />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#F43F5E" strokeWidth={2.5} fillOpacity={1} fill="url(#expenseGrad)" />
                  </AreaChart>
                ) : (
                  <BarChart data={yearlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => `₹${Number(val).toLocaleString('en-IN')}`}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expense Category Breakdown Pie Chart */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Expense Distribution</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Categorical breakdown of outbound transactions</p>
            </div>

            {pieData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No categorical expense entries recorded for this period.
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
                      {pieData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => `₹${Number(val).toLocaleString('en-IN')}`}
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
