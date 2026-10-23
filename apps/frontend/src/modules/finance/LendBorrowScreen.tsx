import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import {
  FormInput,
  FormTextarea,
  DatePicker,
} from "../../components/ui/FormControls";
import {
  apiErrorMessage,
  formatDateOnly,
  todayDateOnly,
  toIsoUtcDate,
} from "../../lib/utils";
import {
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Loader2,
  History,
  Edit2,
} from "lucide-react";

interface Party {
  _id: string;
  name: string;
  phone?: string | null;
  notes?: string | null;
}

interface LendBorrowEntry {
  _id: string;
  type: "LEND" | "BORROW";
  amount: number;
  currency: string;
  note?: string;
  date: string;
  isSettlement: boolean;
}

interface LendBorrowLedger {
  _id: string;
  partyId: Party | string;
  entries: LendBorrowEntry[];
  balance: number;
  createdAt: string;
}

type PartyFilter = "all" | "settled" | "unsettled";

export const LendBorrowScreen: React.FC = () => {
  const [ledgers, setLedgers] = useState<LendBorrowLedger[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null);
  const [partyFilter, setPartyFilter] = useState<PartyFilter>("unsettled");

  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyNotes, setPartyNotes] = useState("");
  const [partySaving, setPartySaving] = useState(false);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<"LEND" | "BORROW">("LEND");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [entryDate, setEntryDate] = useState(todayDateOnly());
  const [entrySaving, setEntrySaving] = useState(false);

  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("Settlement payment");
  const [settleDate, setSettleDate] = useState(todayDateOnly());
  const [settleSaving, setSettleSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ledgersRes, partiesRes] = await Promise.all([
        api.get("/finance/lend-borrow"),
        api.get("/party"),
      ]);
      setLedgers(ledgersRes.data);
      setParties(partiesRes.data);
      if (ledgersRes.data.length > 0 && !selectedLedgerId) {
        setSelectedLedgerId(ledgersRes.data[0]._id);
      }
    } catch (err) {
      console.error("Failed to load lend-borrow ledgers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openPartyModal = (party?: Party) => {
    setEditingParty(party ?? null);
    setPartyName(party?.name ?? "");
    setPartyPhone(party?.phone ?? "");
    setPartyNotes(party?.notes ?? "");
    setIsPartyModalOpen(true);
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) return;

    setPartySaving(true);
    try {
      const payload = {
        name: partyName.trim(),
        phone: partyPhone.trim(),
        notes: partyNotes.trim(),
      };

      if (editingParty) {
        const res = await api.patch(`/party/${editingParty._id}`, payload);
        const updated: Party = res.data;
        setParties((prev) =>
          prev.map((p) => (p._id === updated._id ? updated : p)),
        );
        // Ledgers may carry a populated party, so keep their copy in sync too.
        setLedgers((prev) =>
          prev.map((l) =>
            typeof l.partyId === "object" && l.partyId?._id === updated._id
              ? { ...l, partyId: updated }
              : l,
          ),
        );
      } else {
        const partyRes = await api.post("/party", {
          name: payload.name,
          phone: payload.phone || undefined,
          notes: payload.notes || undefined,
        });

        const ledgerRes = await api.post("/finance/lend-borrow", {
          partyId: partyRes.data._id,
        });

        setParties((prev) => [partyRes.data, ...prev]);
        setLedgers((prev) => [ledgerRes.data, ...prev]);
        setSelectedLedgerId(ledgerRes.data._id);
      }

      setIsPartyModalOpen(false);
      setEditingParty(null);
      setPartyName("");
      setPartyPhone("");
      setPartyNotes("");
    } catch (err: any) {
      alert(
        apiErrorMessage(
          err,
          editingParty ? "Failed to update party" : "Failed to create party",
        ),
      );
    } finally {
      setPartySaving(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedgerId || !entryAmount || parseFloat(entryAmount) <= 0)
      return;

    setEntrySaving(true);
    try {
      const res = await api.post(
        `/finance/lend-borrow/${selectedLedgerId}/entry`,
        {
          type: entryType,
          amount: parseFloat(entryAmount),
          note: entryNote.trim() || undefined,
          date: toIsoUtcDate(entryDate),
        },
      );

      setLedgers((prev) =>
        prev.map((l) => (l._id === selectedLedgerId ? res.data : l)),
      );
      setIsEntryModalOpen(false);
      setEntryAmount("");
      setEntryNote("");
    } catch (err: any) {
      alert(apiErrorMessage(err, "Failed to record entry"));
    } finally {
      setEntrySaving(false);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedgerId || !settleAmount || parseFloat(settleAmount) <= 0)
      return;

    setSettleSaving(true);
    try {
      const res = await api.post(
        `/finance/lend-borrow/${selectedLedgerId}/settle`,
        {
          amount: parseFloat(settleAmount),
          note: settleNote.trim() || undefined,
          date: toIsoUtcDate(settleDate),
        },
      );

      setLedgers((prev) =>
        prev.map((l) => (l._id === selectedLedgerId ? res.data : l)),
      );
      setIsSettleModalOpen(false);
    } catch (err: any) {
      alert(apiErrorMessage(err, "Failed to settle ledger"));
    } finally {
      setSettleSaving(false);
    }
  };

  const activeLedger = useMemo(() => {
    return ledgers.find((l) => l._id === selectedLedgerId);
  }, [ledgers, selectedLedgerId]);

  const filteredLedgers = useMemo(() => {
    if (partyFilter === "settled")
      return ledgers.filter((ledger) => ledger.balance === 0);
    if (partyFilter === "unsettled")
      return ledgers.filter((ledger) => ledger.balance !== 0);
    return ledgers;
  }, [ledgers, partyFilter]);

  useEffect(() => {
    if (filteredLedgers.length === 0) {
      setSelectedLedgerId(null);
      return;
    }

    if (!filteredLedgers.some((ledger) => ledger._id === selectedLedgerId)) {
      setSelectedLedgerId(filteredLedgers[0]._id);
    }
  }, [filteredLedgers, selectedLedgerId]);

  const activeBalance = activeLedger?.balance ?? 0;

  const getParty = (partyId: any): Party | undefined => {
    if (typeof partyId === "object" && partyId?._id) {
      return parties.find((p) => p._id === partyId._id) ?? (partyId as Party);
    }
    return parties.find((p) => p._id === partyId);
  };

  const getPartyName = (partyId: any) =>
    getParty(partyId)?.name || "Unknown Contact";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            Lend & Borrow
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Per-party append-only ledgers and one-click settlements
          </p>
        </div>

        <button
          onClick={() => openPartyModal()}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact Party</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs font-medium">Loading ledger records...</span>
        </div>
      ) : ledgers.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
          <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
            No parties added yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Click "+ Add Contact Party" to create a ledger for friends, family,
            or colleague cash transfers.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start lg:h-[calc(100vh-13rem)] lg:overflow-hidden">
          <div className="lg:col-span-4 lg:h-full lg:min-h-0 lg:flex lg:flex-col">
            <div className="flex items-center justify-between gap-3 px-1 mb-3 shrink-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Parties ({filteredLedgers.length})
              </h4>
              <div className="flex items-center rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                {(
                  [
                    ["all", "All"],
                    ["settled", "Settled"],
                    ["unsettled", "Unsettled"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPartyFilter(value)}
                    aria-pressed={partyFilter === value}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      partyFilter === value
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
              {filteredLedgers.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
                  No {partyFilter} parties found.
                </div>
              ) : (
                filteredLedgers.map((l) => {
                  const name = getPartyName(l.partyId);
                  const bal = l.balance;
                  const isSelected = selectedLedgerId === l._id;

                  return (
                    <div
                      key={l._id}
                      onClick={() => setSelectedLedgerId(l._id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-slate-900 border-indigo-500/50 shadow-md shadow-indigo-500/5"
                          : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-sm">
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 className="truncate font-bold text-sm text-slate-900 dark:text-white">
                              {name}
                            </h5>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const party = getParty(l.partyId);
                                if (party) openPartyModal(party);
                              }}
                              className="p-1 rounded-md text-slate-300 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit party details"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {l.entries?.length || 0} entries
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`text-xs font-bold font-mono ${
                            bal > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : bal < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-slate-400"
                          }`}
                        >
                          {bal > 0
                            ? `+₹${bal.toLocaleString()}`
                            : bal < 0
                              ? `-₹${Math.abs(bal).toLocaleString()}`
                              : "Settled"}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {bal > 0
                            ? "You receive"
                            : bal < 0
                              ? "You owe"
                              : "Zero balance"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-8 lg:h-full lg:min-h-0">
            {activeLedger ? (
              <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-6 lg:h-full lg:overflow-y-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                      Active Ledger
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {getPartyName(activeLedger.partyId)}
                      </h3>
                      <button
                        onClick={() => {
                          const party = getParty(activeLedger.partyId);
                          if (party) openPartyModal(party);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit party details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {getParty(activeLedger.partyId)?.phone && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {getParty(activeLedger.partyId)?.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right sm:pr-4 sm:border-r border-slate-200 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 block">
                        Current Balance
                      </span>
                      <span
                        className={`text-xl font-extrabold font-mono ${
                          activeBalance > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : activeBalance < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-400"
                        }`}
                      >
                        {activeBalance > 0
                          ? `+₹${activeBalance.toLocaleString("en-IN")}`
                          : activeBalance < 0
                            ? `-₹${Math.abs(activeBalance).toLocaleString("en-IN")}`
                            : "₹0.00 (Settled)"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEntryDate(todayDateOnly());
                          setIsEntryModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Record Entry</span>
                      </button>

                      {activeBalance !== 0 && (
                        <button
                          onClick={() => {
                            setSettleAmount(Math.abs(activeBalance).toString());
                            setIsSettleModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settle</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <History className="w-3.5 h-3.5" /> Append-Only Transaction
                    History
                  </h4>

                  {!activeLedger.entries ||
                  activeLedger.entries.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center italic">
                      No transactions recorded with this party yet. Click "+
                      Record Entry" above.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activeLedger.entries.map((entry, idx) => (
                        <div
                          key={entry._id || idx}
                          className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                entry.isSettlement
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                  : entry.type === "LEND"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {entry.isSettlement ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : entry.type === "LEND" ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : (
                                <ArrowDownLeft className="w-4 h-4" />
                              )}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {entry.isSettlement
                                    ? "Settlement Payment"
                                    : entry.type === "LEND"
                                      ? "You Lent"
                                      : "You Borrowed"}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {formatDateOnly(entry.date)}
                                </span>
                              </div>
                              {entry.note && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {entry.note}
                                </p>
                              )}
                            </div>
                          </div>

                          <span
                            className={`font-mono font-bold text-sm ${
                              entry.isSettlement
                                ? "text-purple-600 dark:text-purple-400"
                                : entry.type === "LEND"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            ₹
                            {entry.amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Select a party to view their ledger.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add Party Modal */}
      <AnimatePresence>
        {isPartyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="my-auto w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  {editingParty ? "Edit Contact Party" : "Add Contact Party"}
                </h3>
                <button
                  onClick={() => setIsPartyModalOpen(false)}
                  className="text-slate-400"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveParty} className="space-y-4">
                <FormInput
                  label="Party / Person Name *"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Alex, Mom, Roommate"
                />

                <FormInput
                  label="Phone Number"
                  value={partyPhone}
                  onChange={(e) => setPartyPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />

                <FormTextarea
                  label="Notes"
                  rows={2}
                  value={partyNotes}
                  onChange={(e) => setPartyNotes(e.target.value)}
                  placeholder="Optional context, e.g. how you know them"
                />

                <div className="flex items-center justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsPartyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={partySaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {partySaving
                      ? editingParty
                        ? "Saving..."
                        : "Creating..."
                      : editingParty
                        ? "Save Changes"
                        : "Create Party"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Entry Modal */}
      <AnimatePresence>
        {isEntryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="my-auto w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Record Transaction
                </h3>
                <button
                  onClick={() => setIsEntryModalOpen(false)}
                  className="text-slate-400"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEntryType("LEND")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      entryType === "LEND"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    You Lent (Gave)
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntryType("BORROW")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      entryType === "BORROW"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    You Borrowed (Took)
                  </button>
                </div>

                <FormInput
                  label="Amount (₹) *"
                  type="number"
                  step="0.01"
                  required
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="5000"
                  className="text-base font-mono font-bold"
                />

                <FormInput
                  label="Purpose / Note"
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                  placeholder="e.g. Dinner split, Emergency cash"
                />

                <DatePicker
                  label="Date"
                  value={entryDate}
                  onChange={(val) => setEntryDate(val)}
                />

                <div className="flex items-center justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEntryModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={entrySaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {entrySaving ? "Saving..." : "Add Record"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settle Modal */}
      <AnimatePresence>
        {isSettleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="my-auto w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-8 shadow-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Record Settlement
                </h3>
                <button
                  onClick={() => setIsSettleModalOpen(false)}
                  className="text-slate-400"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSettle} className="space-y-4">
                <FormInput
                  label="Settlement Amount (₹) *"
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="text-base font-mono font-bold"
                />

                <FormInput
                  label="Settlement Note"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Paid via UPI"
                />

                <DatePicker
                  label="Settlement Date"
                  value={settleDate}
                  onChange={(val) => setSettleDate(val)}
                />

                <div className="flex items-center justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsSettleModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={settleSaving}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {settleSaving ? "Recording..." : "Confirm Settle"}
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
