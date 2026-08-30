import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { FormInput } from '../../components/ui/FormControls';
import {
  CreditCard,
  Plus,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface Installment {
  _id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paid: boolean;
  paidAt?: string;
}

interface EmiItem {
  _id: string;
  loanName: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  installmentAmount: number;
  startDate: string;
  installments: Installment[];
  status: string;
  createdAt: string;
}

export const EmiScreen: React.FC = () => {
  const [emis, setEmis] = useState<EmiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loanName, setLoanName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('10');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmis = async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/emi');
      setEmis(res.data);
    } catch (err) {
      console.error('Failed to fetch EMIs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmis();
  }, []);

  const openCreateModal = () => {
    setError(null);
    setLoanName('');
    setPrincipal('');
    setInterestRate('10');
    setTenureMonths('12');
    setStartDate(new Date().toISOString().slice(0, 10));
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanName.trim() || !principal || parseFloat(principal) <= 0) {
      setError('Please provide a valid loan title and principal amount.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await api.post('/finance/emi', {
        loanName: loanName.trim(),
        principal: parseFloat(principal),
        interestRate: parseFloat(interestRate) || 0,
        tenureMonths: parseInt(tenureMonths, 10) || 12,
        startDate: new Date(startDate).toISOString(),
      });
      setEmis((prev) => [res.data, ...prev]);
      setIsModalOpen(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response?.data?.message.join(', ')
          : 'Failed to create loan schedule');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (emiId: string, installmentId: string) => {
    try {
      const res = await api.patch(`/finance/emi/${emiId}/installment/${installmentId}/mark-paid`, {});
      setEmis((prev) => prev.map((item) => (item._id === emiId ? res.data : item)));
    } catch {
      alert('Failed to mark installment as paid.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            EMI & Loans
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Auto-generate installment schedules and track monthly payments with zero interest confusion
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Loan / EMI</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs font-medium">Calculating amortizations...</span>
        </div>
      ) : emis.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
          <CreditCard className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No active loans found</p>
          <p className="text-xs text-slate-400 mt-1">
            Click "+ New Loan / EMI" to record a gadget purchase, vehicle loan, or personal credit.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {emis.map((item) => {
            const isExpanded = expandedId === item._id;
            const paidCount = item.installments?.filter((i) => i.paid).length || 0;
            const totalCount = item.installments?.length || item.tenureMonths;
            const progressPercent = Math.round((paidCount / totalCount) * 100);

            return (
              <div
                key={item._id}
                className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item._id)}
                  className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {item.loanName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Principal ₹{(item.principal || 0).toLocaleString('en-IN')} · {item.interestRate}% APR · {item.tenureMonths} Months
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block">Monthly EMI</span>
                      <span className="text-base font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        ₹{(item.installmentAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="w-28 sm:w-36">
                      <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
                        <span className="text-slate-500">Paid: {paidCount}/{totalCount}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 sm:p-6"
                    >
                      <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                        Installment Schedule Breakdown
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {item.installments?.map((inst) => (
                          <div
                            key={inst._id}
                            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                              inst.paid
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {inst.paid ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <div>
                                <span className="font-bold text-xs block">
                                  Installment #{inst.installmentNumber}
                                </span>
                                <span className="text-[11px] font-mono opacity-80 block">
                                  Due {new Date(inst.dueDate).toLocaleDateString()}
                                </span>
                                <span className="text-xs font-mono font-bold">
                                  ₹{inst.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            {!inst.paid && (
                              <button
                                onClick={() => handleMarkPaid(item._id, inst._id)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
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
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    New Loan / EMI Schedule
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

              <form onSubmit={handleCreate} className="space-y-4">
                <FormInput
                  label="Loan Title / Asset Name *"
                  required
                  value={loanName}
                  onChange={(e) => setLoanName(e.target.value)}
                  placeholder="e.g. MacBook Pro M3, Car Loan"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Principal Amount (₹) *"
                    type="number"
                    step="0.01"
                    required
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="120000"
                    className="font-mono font-bold"
                  />

                  <FormInput
                    label="Annual Interest (%)"
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="0 for No-Cost EMI"
                    className="font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Tenure (Months) *"
                    type="number"
                    required
                    min="1"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                  />

                  <FormInput
                    label="First Due Date *"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
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
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Schedule...</span>
                      </>
                    ) : (
                      <span>Create Loan Schedule</span>
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
