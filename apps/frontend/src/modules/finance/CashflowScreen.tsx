import React, { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../lib/api';
import { FormInput, FormSelect, DatePicker } from '../../components/ui/FormControls';
import { apiErrorMessage, formatDateOnly, todayDateOnly, toIsoUtcDate } from '../../lib/utils';
import {
  EXPENSE_CATEGORIES,
  INCOME_SOURCES,
  formatConstantLabel,
  type ExpenseCategory,
  type IncomeSource,
  type FinanceRecurrenceFreq,
} from '@nestwell/shared-types';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  DollarSign,
  Loader2,
  Repeat,
  RepeatOff,
} from 'lucide-react';

interface ExpenseItem {
  _id: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  note?: string;
  date: string;
  recurring: boolean;
  recurrence?: {
    frequency: FinanceRecurrenceFreq;
    interval: number;
  };
  createdAt: string;
}

interface IncomeItem {
  _id: string;
  amount: number;
  currency: string;
  source: IncomeSource;
  note?: string;
  date: string;
  recurring: boolean;
  recurrence?: {
    frequency: FinanceRecurrenceFreq;
    interval: number;
  };
  createdAt: string;
}

const ALL_MONTHS = 'ALL';

const MONTH_OPTIONS = [
  { value: ALL_MONTHS, label: 'Whole year' },
  ...[
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ].map((label, idx) => ({ value: String(idx + 1), label })),
];

const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  return [current - 2, current - 1, current, current + 1].map((y) => ({
    value: String(y),
    label: String(y),
  }));
})();

export const CashflowScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('FOOD');
  const [source, setSource] = useState<IncomeSource>('SALARY');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayDateOnly());
  const [recurring, setRecurring] = useState(false);
  const [freq, setFreq] = useState<FinanceRecurrenceFreq>('MONTHLY');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));

  const fetchData = async () => {
    setLoading(true);
    try {
      // An empty month means "whole year"; the backend skips the date filter without a year.
      const params = {
        year: filterYear,
        ...(filterMonth === ALL_MONTHS ? {} : { month: filterMonth }),
      };
      const [expRes, incRes] = await Promise.all([
        api.get('/finance/expense', { params }),
        api.get('/finance/income', { params }),
      ]);
      setExpenses(expRes.data);
      setIncomes(incRes.data);
    } catch (err) {
      console.error('Failed to load cashflow', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterMonth, filterYear]);

  const openCreateModal = () => {
    setError(null);
    setAmount('');
    setNote('');
    setDate(todayDateOnly());
    setRecurring(false);
    setFreq('MONTHLY');
    setCategory('FOOD');
    setSource('SALARY');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setSaving(true);
    setError(null);

    const parsedDate = toIsoUtcDate(date);

    const payload = {
      amount: parseFloat(amount),
      currency: 'INR',
      note: note.trim() || undefined,
      date: parsedDate,
      recurring,
      recurrence: recurring
        ? {
            frequency: freq,
            interval: 1,
            nextRunDate: parsedDate,
          }
        : undefined,
    };

    try {
      if (activeTab === 'expense') {
        await api.post('/finance/expense', { ...payload, category });
      } else {
        await api.post('/finance/income', { ...payload, source });
      }
      setIsModalOpen(false);
      // Refetch rather than prepend: a saved entry may fall outside the active period,
      // and silently showing it here would misrepresent the filter.
      await fetchData();
    } catch (err: any) {
      setError(apiErrorMessage(err, 'Failed to record entry'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, type: 'expense' | 'income') => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`/finance/${type}/${id}`);
      if (type === 'expense') {
        setExpenses((prev) => prev.filter((e) => e._id !== id));
      } else {
        setIncomes((prev) => prev.filter((i) => i._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const handleToggleRecurring = async (id: string, type: 'expense' | 'income', currentRecurring: boolean) => {
    try {
      await api.patch(`/finance/${type}/${id}`, { recurring: !currentRecurring });
      if (type === 'expense') {
        setExpenses((prev) =>
          prev.map((e) => (e._id === id ? { ...e, recurring: !currentRecurring, recurrence: !currentRecurring ? e.recurrence : undefined } : e)),
        );
      } else {
        setIncomes((prev) =>
          prev.map((i) => (i._id === id ? { ...i, recurring: !currentRecurring, recurrence: !currentRecurring ? i.recurrence : undefined } : i)),
        );
      }
    } catch (err) {
      console.error('Failed to toggle recurring', err);
    }
  };

  const totalExpense = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [expenses]);

  const totalIncome = useMemo(() => {
    return incomes.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [incomes]);

  const netBalance = totalIncome - totalExpense;

  const periodLabel =
    filterMonth === ALL_MONTHS
      ? filterYear
      : `${MONTH_OPTIONS.find((m) => m.value === filterMonth)?.label} ${filterYear}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Income & Expenses
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track daily cashflow transactions with automated recurring projection
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-36">
            <FormSelect
              value={filterMonth}
              onChange={(val) => setFilterMonth(val)}
              options={MONTH_OPTIONS}
            />
          </div>
          <div className="w-24">
            <FormSelect
              value={filterYear}
              onChange={(val) => setFilterYear(val)}
              options={YEAR_OPTIONS}
            />
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record {activeTab === 'expense' ? 'Expense' : 'Income'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Inflow</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {incomes.length} deposits in {periodLabel}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Outflow</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            ₹{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            {expenses.length} payments in {periodLabel}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Cashflow</span>
            <div className={`w-8 h-8 rounded-lg ${netBalance >= 0 ? 'bg-indigo-500/10 text-indigo-600' : 'bg-rose-500/10 text-rose-600'} flex items-center justify-center`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-bold ${netBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {netBalance < 0 ? `-₹${Math.abs(netBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">{netBalance >= 0 ? 'Positive balance' : 'Negative cashflow'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('expense')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'expense'
                ? 'border-indigo-600 text-indigo-600 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <span>Expenses ({expenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('income')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'income'
                ? 'border-indigo-600 text-indigo-600 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Income ({incomes.length})</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs font-medium">Loading ledger entries...</span>
        </div>
      ) : (activeTab === 'expense' ? expenses : incomes).length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
          <DollarSign className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
            No {activeTab} records in {periodLabel}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try another month, or click "+ Record {activeTab === 'expense' ? 'Expense' : 'Income'}" to
            track your cashflow.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">{activeTab === 'expense' ? 'Category' : 'Source'}</th>
                  <th className="py-3.5 px-4">Note / Details</th>
                  <th className="py-3.5 px-4">Recurring</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(activeTab === 'expense' ? expenses : incomes).map((item: any) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {formatDateOnly(item.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                        {item.category || item.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {item.note || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.recurring ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center gap-1 w-max">
                          <Repeat className="w-3 h-3" />
                          <span className="capitalize">{item.recurrence?.frequency?.toLowerCase()}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                      <span className={activeTab === 'expense' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                        {activeTab === 'expense' ? '-₹' : '+₹'}{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.recurring && (
                          <button
                            onClick={() => handleToggleRecurring(item._id, activeTab, true)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-400 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Turn off recurring"
                          >
                            <RepeatOff className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item._id, activeTab)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl ${activeTab === 'expense' ? 'bg-rose-600' : 'bg-emerald-600'} text-white flex items-center justify-center shadow-md`}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white capitalize">
                    Record {activeTab}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <FormInput
                  label="Amount (INR ₹) *"
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-base font-bold font-mono"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeTab === 'expense' ? (
                    <FormSelect
                      label="Expense Category *"
                      value={category}
                      onChange={(val: any) => setCategory(val)}
                      options={EXPENSE_CATEGORIES.map((cat) => ({
                        value: cat,
                        label: formatConstantLabel(cat),
                      }))}
                    />
                  ) : (
                    <FormSelect
                      label="Income Source *"
                      value={source}
                      onChange={(val: any) => setSource(val)}
                      options={INCOME_SOURCES.map((src) => ({
                        value: src,
                        label: formatConstantLabel(src),
                      }))}
                    />
                  )}

                  <DatePicker
                    label="Date *"
                    value={date}
                    onChange={(val) => setDate(val)}
                  />
                </div>

                <FormInput
                  label="Description / Note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Dinner, Client payment, AWS bill"
                />

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Recurring Transaction
                    </span>
                    <input
                      type="checkbox"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {recurring && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <FormSelect
                        label="Recurring Frequency"
                        value={freq}
                        onChange={(val: any) => setFreq(val)}
                        options={[
                          { value: 'WEEKLY', label: 'Weekly' },
                          { value: 'MONTHLY', label: 'Monthly' },
                          { value: 'YEARLY', label: 'Yearly' },
                        ]}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 ${
                      activeTab === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save {activeTab === 'expense' ? 'Expense' : 'Income'}</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
