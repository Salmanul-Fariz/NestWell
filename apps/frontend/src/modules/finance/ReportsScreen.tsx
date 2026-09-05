import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { formatConstantLabel } from '@nestwell/shared-types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
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
  Info,
  X,
  BookOpen,
  Calculator,
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  return [current - 2, current - 1, current, current + 1];
})();

const metricMeaning = (title: string) => {
  if (title === 'Net Cash Flow')
    return 'A positive result means more money came in than went out during the selected period. A negative result means spending was higher than recorded income.';
  if (title === 'Owed to you')
    return 'This is money you expect to receive from other people. It does not mean the money is already available in your account.';
  if (title === 'You owe')
    return 'This is money you are expected to pay back to other people. It is treated as an outstanding obligation until repayments are recorded.';
  if (title === 'Recorded Liquid Cash')
    return 'This is the cash movement recorded in Nestwell after income, borrowing, collections, expenses, lending, and repayments are considered.';
  if (title === 'Financial Position')
    return 'This gives an overall view of your position by combining available cash with money you should receive, then removing money you need to pay.';
  if (title === 'Monthly Burn Rate')
    return 'This helps you estimate your usual monthly spending. It is an average, so it can be different from the expense total for the selected month.';
  if (title === 'Leverage Ratio')
    return 'A lower percentage generally means less dependence on outstanding obligations. A higher percentage means more of your position is connected to money you owe.';
  if (title === 'Total Income')
    return 'This is the total money received from income records in the selected period. It does not include borrowed money or repayments from parties.';
  if (title === 'Net Party Position')
    return 'A positive result means parties owe you more than you owe them. A negative result means you owe parties more than they owe you.';
  if (title === 'Total Expense')
    return 'This is the total money spent from expense records in the selected period. It does not include money lent to parties.';
  return 'This value is calculated from the records available for the selected period.';
};

const money = (value: number) =>
  `${value < 0 ? '-₹' : '₹'}${Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

interface ReportPayload {
  totalIncome: number;
  totalExpense: number;
  monthSavings: number;
  netLendBalance: number;
  netBorrowBalance: number;
  netPartyPosition?: number;
  totalBalance?: number;
  netCashFlow?: number;
  financialPosition?: {
    recordedLiquidCash: number;
    receivables: number;
    payables: number;
    netWorth: number;
    monthlyBurnRate: number;
    leverageRatio: number | null;
    collectionsReceived: number;
    repaymentsPaid: number;
  };
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
    partyCashIn?: number;
    partyCashOut?: number;
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
    partyCashIn?: number;
    partyCashOut?: number;
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
  const [selectedMetric, setSelectedMetric] = useState<{ title: string; detail: string } | null>(null);

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
  const netLendBalance = report?.netLendBalance || 0;
  const netBorrowBalance = report?.netBorrowBalance || 0;
  const netPartyPosition = report?.netPartyPosition ?? netLendBalance - netBorrowBalance;
  const netCashFlow = report?.netCashFlow ?? totalIncome - totalExpense;
  const totalLendGiven = report?.totalLendGiven ?? netLendBalance;
  const totalBorrowReceived = report?.totalBorrowReceived ?? netBorrowBalance;
  const totalRepaymentsReceived = report?.totalRepaymentsReceived ?? 0;
  const totalRepaymentsPaid = report?.totalRepaymentsPaid ?? 0;
  const financialPosition = report?.financialPosition ?? {
    recordedLiquidCash: 0,
    receivables: netLendBalance,
    payables: netBorrowBalance,
    netWorth: netPartyPosition,
    monthlyBurnRate: 0,
    leverageRatio: null,
    collectionsReceived: 0,
    repaymentsPaid: 0,
  };
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
      partyCashIn: m.partyCashIn ?? m.borrow,
      partyCashOut: m.partyCashOut ?? m.lend,
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
      partyCashIn: w.partyCashIn ?? w.borrow,
      partyCashOut: w.partyCashOut ?? w.lend,
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
            Cash flow, expenses, and outstanding party balances for {periodLabel}
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
                <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val, 10))}>
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
              <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val, 10))}>
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
        {/* Period net cash flow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Cash Flow</span>
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-lg ${netCashFlow >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'} flex items-center justify-center`}
              >
                {netCashFlow >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedMetric({
                    title: 'Net Cash Flow',
                    detail: `Calculation: total income (${money(totalIncome)}) minus total expenses (${money(totalExpense)}) equals ${money(netCashFlow)}. This shows whether your recorded cash flow increased or decreased during ${periodLabel}.`,
                  })
                }
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                aria-label="How Net Cash Flow is calculated"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>
          <h3
            className={`text-2xl font-extrabold font-mono ${netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {money(netCashFlow)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Money received minus money spent during {periodLabel}</p>
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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedMetric({
                    title: 'Owed to you',
                    detail: `Calculation: money lent to parties (${money(totalLendGiven)}) minus repayments received (${money(totalRepaymentsReceived)}) equals ${money(netLendBalance)}. This is the amount parties still need to return to you.`,
                  })
                }
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                aria-label="How Owed to you is calculated"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>
          <h3 className="text-2xl font-extrabold font-mono text-sky-600 dark:text-sky-400">{money(netLendBalance)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Money still owed to you by all parties</p>
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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedMetric({
                    title: 'You owe',
                    detail: `Calculation: money borrowed from parties (${money(totalBorrowReceived)}) minus repayments you made (${money(totalRepaymentsPaid)}) equals ${money(netBorrowBalance)}. This is the amount you still need to return.`,
                  })
                }
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                aria-label="How You owe is calculated"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>
          <h3 className="text-2xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {money(netBorrowBalance)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">Money you still owe to all parties</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Recorded Liquid Cash</span>
            <button
              type="button"
              onClick={() =>
                setSelectedMetric({
                  title: 'Recorded Liquid Cash',
                  detail: `Calculation: income (${money(totalIncome)}) + borrowed money (${money(totalBorrowReceived)}) + repayments received (${money(totalRepaymentsReceived)}) - expenses (${money(totalExpense)}) - money lent (${money(totalLendGiven)}) - repayments paid (${money(totalRepaymentsPaid)}) = ${money(financialPosition.recordedLiquidCash)}. This estimates cash movement recorded in the system.`,
                })
              }
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              aria-label="How Recorded Liquid Cash is calculated"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <h4
            className={`mt-1 text-xl font-extrabold font-mono ${financialPosition.recordedLiquidCash >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {money(financialPosition.recordedLiquidCash)}
          </h4>
          <p className="mt-1 text-[11px] text-slate-400">Cash currently recorded as available</p>
        </div>
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Financial Position</span>
            <button
              type="button"
              onClick={() =>
                setSelectedMetric({
                  title: 'Financial Position',
                  detail: `Calculation: liquid cash (${money(financialPosition.recordedLiquidCash)}) + receivables, or money owed to you (${money(financialPosition.receivables)}) - payables, or money you owe (${money(financialPosition.payables)}) = ${money(financialPosition.netWorth)}. This estimates your position after outstanding debts.`,
                })
              }
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              aria-label="How Financial Position is calculated"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <h4
            className={`mt-1 text-xl font-extrabold font-mono ${financialPosition.netWorth >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}
          >
            {money(financialPosition.netWorth)}
          </h4>
          <p className="mt-1 text-[11px] text-slate-400">Your estimated position after outstanding debts</p>
        </div>
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Monthly Burn Rate</span>
            <button
              type="button"
              onClick={() =>
                setSelectedMetric({
                  title: 'Monthly Burn Rate',
                  detail: `Calculation: add your recorded expenses from the last three calendar months, then divide by three. The resulting average monthly spending is ${money(financialPosition.monthlyBurnRate)}.`,
                })
              }
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              aria-label="How Monthly Burn Rate is calculated"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <h4 className="mt-1 text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400">
            {money(financialPosition.monthlyBurnRate)}
          </h4>
          <p className="mt-1 text-[11px] text-slate-400">Typical monthly spending over three months</p>
        </div>
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Leverage Ratio</span>
            <button
              type="button"
              onClick={() =>
                setSelectedMetric({
                  title: 'Leverage Ratio',
                  detail:
                    financialPosition.leverageRatio === null
                      ? 'Calculation: payables divided by liquid cash plus receivables. There is not enough recorded data to calculate a percentage yet.'
                      : `Calculation: payables (${money(financialPosition.payables)}) divided by liquid cash plus receivables (${money(financialPosition.recordedLiquidCash + financialPosition.receivables)}) equals ${(financialPosition.leverageRatio * 100).toFixed(1)}%. A higher percentage means more of your position depends on money owed.`,
                })
              }
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              aria-label="How Leverage Ratio is calculated"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <h4 className="mt-1 text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
            {financialPosition.leverageRatio === null ? '—' : `${(financialPosition.leverageRatio * 100).toFixed(1)}%`}
          </h4>
          <p className="mt-1 text-[11px] text-slate-400">Debt compared with available and owed money</p>
        </div>
      </div>

      {/* Period Income & Expense Breakdown Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
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
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[11px] text-slate-400 truncate">Money received during {periodLabel}</span>
            <button
              type="button"
              onClick={() =>
                setSelectedMetric({
                  title: 'Total Income',
                  detail: `Calculation: add every income record created during ${periodLabel}. The result is ${money(totalIncome)}.`,
                })
              }
              className="shrink-0 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              aria-label="How Total Income is calculated"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${netPartyPosition >= 0 ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}
            >
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Net Party Position</span>
              <h4
                className={`text-xl font-extrabold font-mono ${netPartyPosition >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'}`}
              >
                {money(netPartyPosition)}
              </h4>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[11px] text-slate-400 truncate">What others owe you compared with what you owe</span>
            <button
              type="button"
              onClick={() =>
                setSelectedMetric({
                  title: 'Net Party Position',
                  detail: `Calculation: money owed to you (${money(netLendBalance)}) minus money you owe (${money(netBorrowBalance)}) equals ${money(netPartyPosition)}.`,
                })
              }
              className="shrink-0 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              aria-label="How Net Party Position is calculated"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
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
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[11px] text-slate-400 truncate">Money spent during {periodLabel}</span>
            <button
              type="button"
              onClick={() =>
                setSelectedMetric({
                  title: 'Total Expense',
                  detail: `Calculation: add every expense record created during ${periodLabel}. The result is ${money(totalExpense)}.`,
                })
              }
              className="shrink-0 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              aria-label="How Total Expense is calculated"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
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
                Cash received and paid, including party repayments and settlements
              </p>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={viewMode === 'monthly' ? monthlyTrendData : yearlyChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
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
                  <Bar dataKey="partyCashIn" name="Party cash received" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="partyCashOut" name="Party cash paid" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net cash flow"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Expense allocation</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Where your recorded expenses went in {periodLabel}
              </p>
            </div>

            {pieData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No expenses recorded for this period.
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

      {selectedMetric && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6"
          onClick={() => setSelectedMetric(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="metric-detail-title"
            className="w-full max-w-lg max-h-[min(680px,calc(100vh-3rem))] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600 dark:text-indigo-400">
                      Metric guide
                    </p>
                    <h3 id="metric-detail-title" className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                      {selectedMetric.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {periodLabel} · {viewMode === 'monthly' ? 'Monthly view' : 'Yearly view'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMetric(null)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Close calculation details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <section>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <Calculator className="h-4 w-4 text-indigo-500" />
                  How this value is calculated
                </div>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm leading-6 text-slate-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-slate-200">
                  {selectedMetric.detail}
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  How to understand it
                </h4>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {metricMeaning(selectedMetric.title)}
                </p>
              </section>

              <section className="rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-800/60">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Important note
                </h4>
                <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  The result uses only records saved in Nestwell for the selected period. Adding, editing, or settling a
                  record can change this value.
                </p>
              </section>
            </div>
            <div className="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-800 sm:px-6">
              <button
                type="button"
                onClick={() => setSelectedMetric(null)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
