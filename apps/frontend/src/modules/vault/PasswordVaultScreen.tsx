import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { encryptPassword, decryptPassword, generateStrongPassword } from '../../lib/crypto';
import { useAuth } from '../../lib/auth-context';
import { apiErrorMessage } from '../../lib/utils';
import { VAULT_CATEGORIES, formatConstantLabel, toConstantCase } from '@nestwell/shared-types';
import { FormInput, FormSelect, FormTextarea } from '../../components/ui/FormControls';
import {
  KeyRound,
  Plus,
  Search,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Edit2,
  Loader2,
  Sparkles,
  Globe,
  User,
} from 'lucide-react';

const ALL_CATEGORIES = 'ALL';
const CUSTOM_CATEGORY = '__CUSTOM__';
const DEFAULT_CATEGORY = 'PERSONAL';

interface PasswordEntry {
  _id: string;
  title: string;
  username?: string;
  encryptedPassword: string;
  url?: string;
  notes?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export const PasswordVaultScreen: React.FC = () => {
  const { cryptoKey } = useAuth();

  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORIES);

  const [decryptedMap, setDecryptedMap] = useState<Record<string, string>>({});
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PasswordEntry | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalUsername, setModalUsername] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalUrl, setModalUrl] = useState('');
  const [modalCategory, setModalCategory] = useState<string>(DEFAULT_CATEGORY);
  const [modalCustomCategory, setModalCustomCategory] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vault');
      setEntries(res.data);
    } catch (err: any) {
      console.error('Failed to fetch vault items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const toggleRevealPassword = async (entry: PasswordEntry) => {
    if (!cryptoKey) return;

    if (revealedIds[entry._id]) {
      setRevealedIds((prev) => ({ ...prev, [entry._id]: false }));
      return;
    }

    try {
      if (!decryptedMap[entry._id]) {
        const plain = await decryptPassword(entry.encryptedPassword, cryptoKey);
        setDecryptedMap((prev) => ({ ...prev, [entry._id]: plain }));
      }
      setRevealedIds((prev) => ({ ...prev, [entry._id]: true }));
    } catch {
      alert('Decryption failed. Password could not be decrypted.');
    }
  };

  const handleCopyPassword = async (entry: PasswordEntry) => {
    if (!cryptoKey) return;
    try {
      let plain = decryptedMap[entry._id];
      if (!plain) {
        plain = await decryptPassword(entry.encryptedPassword, cryptoKey);
        setDecryptedMap((prev) => ({ ...prev, [entry._id]: plain }));
      }
      await navigator.clipboard.writeText(plain);
      setCopiedId(entry._id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      alert('Decryption failed for copying.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this credential?')) return;
    try {
      await api.delete(`/vault/${id}`);
      setEntries((prev) => prev.filter((item) => item._id !== id));
    } catch {
      alert('Failed to delete item.');
    }
  };

  const openModal = async (entry?: PasswordEntry) => {
    setModalError(null);
    if (entry) {
      setEditingEntry(entry);
      setModalTitle(entry.title);
      setModalUsername(entry.username || '');
      setModalUrl(entry.url || '');
      const stored = toConstantCase(entry.category || '') || DEFAULT_CATEGORY;
      if ((VAULT_CATEGORIES as readonly string[]).includes(stored)) {
        setModalCategory(stored);
        setModalCustomCategory('');
      } else {
        setModalCategory(CUSTOM_CATEGORY);
        setModalCustomCategory(formatConstantLabel(stored));
      }
      setModalNotes(entry.notes || '');

      let existingPassword = decryptedMap[entry._id] || '';
      if (!existingPassword && cryptoKey) {
        try {
          existingPassword = await decryptPassword(entry.encryptedPassword, cryptoKey);
          setDecryptedMap((prev) => ({ ...prev, [entry._id]: existingPassword }));
        } catch {
          setModalError(
            'Could not decrypt this password. Unlock with the same account password used when it was saved.',
          );
        }
      }
      setModalPassword(existingPassword);
    } else {
      setEditingEntry(null);
      setModalTitle('');
      setModalUsername('');
      setModalPassword(generateStrongPassword(20));
      setModalUrl('');
      setModalCategory(DEFAULT_CATEGORY);
      setModalCustomCategory('');
      setModalNotes('');
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoKey) {
      setModalError('Encryption key is not available. Please re-login.');
      return;
    }
    if (!modalTitle.trim() || !modalPassword.trim()) {
      setModalError('Title and Password are required.');
      return;
    }

    // Categories are always stored in CONSTANT_CASE, whatever the user typed.
    const finalCategory =
      modalCategory === CUSTOM_CATEGORY
        ? toConstantCase(modalCustomCategory) || 'OTHER'
        : modalCategory;

    setModalSaving(true);
    setModalError(null);

    try {
      const encryptedPassword = await encryptPassword(modalPassword, cryptoKey);
      const payload = {
        title: modalTitle.trim(),
        username: modalUsername.trim() || undefined,
        encryptedPassword,
        url: modalUrl.trim() || undefined,
        category: finalCategory,
        notes: modalNotes.trim() || undefined,
      };

      if (editingEntry) {
        const res = await api.patch(`/vault/${editingEntry._id}`, payload);
        setEntries((prev) => prev.map((item) => (item._id === editingEntry._id ? res.data : item)));
        setDecryptedMap((prev) => ({ ...prev, [editingEntry._id]: modalPassword }));
      } else {
        const res = await api.post('/vault', payload);
        setEntries((prev) => [res.data, ...prev]);
        setDecryptedMap((prev) => ({ ...prev, [res.data._id]: modalPassword }));
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(apiErrorMessage(err, 'Failed to save credential.'));
    } finally {
      setModalSaving(false);
    }
  };

  /** Only categories that are actually in use, so the filter stays short as the vault grows. */
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    entries.forEach((e) => {
      const key = toConstantCase(e.category || '') || 'OTHER';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    const used = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({
        value,
        label: `${formatConstantLabel(value)} (${count})`,
      }));

    return [{ value: ALL_CATEGORIES, label: `All categories (${entries.length})` }, ...used];
  }, [entries]);

  useEffect(() => {
    if (!categoryOptions.some((opt) => opt.value === selectedCategory)) {
      setSelectedCategory(ALL_CATEGORIES);
    }
  }, [categoryOptions, selectedCategory]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesCat =
        selectedCategory === ALL_CATEGORIES ||
        (toConstantCase(e.category || '') || 'OTHER') === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(q) ||
        (e.username && e.username.toLowerCase().includes(q)) ||
        (e.url && e.url.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [entries, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Password Vault
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Zero-knowledge AES-256 GCM client-encrypted credentials with folder organization
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => openModal()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Password</span>
          </button>
        </div>
      </div>

      {/* Search & category filter */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <FormInput
            icon={<Search className="w-4 h-4" />}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search secrets, usernames, or domains..."
          />
        </div>

        <div className="w-full sm:w-56 shrink-0">
          <FormSelect
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val)}
            options={categoryOptions}
          />
        </div>

        {(selectedCategory !== ALL_CATEGORIES || searchQuery) && (
          <button
            onClick={() => {
              setSelectedCategory(ALL_CATEGORIES);
              setSearchQuery('');
            }}
            className="h-11 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            Reset
          </button>
        )}
      </div>

      {/* Credentials Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="text-xs font-medium">Loading encrypted records...</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
          <KeyRound className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">No passwords found</p>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery
              ? 'Try changing your search keywords.'
              : 'Click "+ Add Password" to store your first credential.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((item) => {
            const isRevealed = revealedIds[item._id];
            const isCopied = copiedId === item._id;
            const plainPassword = decryptedMap[item._id] || '••••••••••••••••';

            return (
              <motion.div
                key={item._id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/40 transition-all shadow-sm flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                        {item.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{item.title}</h4>
                        {item.url && (
                          <a
                            href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-slate-400 hover:text-indigo-500 flex items-center gap-1 mt-0.5 truncate max-w-[180px]"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{item.url.replace(/^https?:\/\//, '')}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {formatConstantLabel(item.category || DEFAULT_CATEGORY)}
                    </span>
                  </div>

                  {item.username && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mb-2.5 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60 font-mono">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate flex-1">{item.username}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs mb-3">
                    <span className="text-slate-800 dark:text-slate-200 truncate select-all">
                      {isRevealed ? plainPassword : '••••••••••••••••'}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleRevealPassword(item)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title={isRevealed ? 'Hide Password' : 'Show Password'}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleCopyPassword(item)}
                        className={`p-1 transition-colors cursor-pointer ${
                          isCopied
                            ? 'text-emerald-500 font-bold'
                            : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                        title="Copy Password"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic mb-3">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                  <span>Updated {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openModal(item)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="Edit Credential"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Credential"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Secret Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {editingEntry ? 'Edit Secret' : 'Create Encrypted Secret'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {modalError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleSaveModal} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Account / Title *"
                    required
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="e.g. GitHub Enterprise"
                  />

                  <div>
                    <FormSelect
                      label="Folder / Category"
                      value={modalCategory}
                      onChange={(val) => setModalCategory(val)}
                      options={[
                        ...VAULT_CATEGORIES.map((c) => ({ value: c, label: formatConstantLabel(c) })),
                        { value: CUSTOM_CATEGORY, label: '+ Custom Folder...' },
                      ]}
                    />

                    {modalCategory === CUSTOM_CATEGORY && (
                      <div className="mt-2">
                        <FormInput
                          placeholder="Type folder name..."
                          value={modalCustomCategory}
                          onChange={(e) => setModalCustomCategory(e.target.value)}
                        />
                        {modalCustomCategory.trim() && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            Saved as <span className="font-mono">{toConstantCase(modalCustomCategory)}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput
                    label="Username / Email"
                    value={modalUsername}
                    onChange={(e) => setModalUsername(e.target.value)}
                    placeholder="user@domain.com"
                  />

                  <FormInput
                    label="Website URL"
                    value={modalUrl}
                    onChange={(e) => setModalUrl(e.target.value)}
                    placeholder="https://app.example.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Password *</label>
                    <button
                      type="button"
                      onClick={() => setModalPassword(generateStrongPassword(20))}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Generate Strong
                    </button>
                  </div>
                  <FormInput
                    type="text"
                    required
                    value={modalPassword}
                    onChange={(e) => setModalPassword(e.target.value)}
                    placeholder="Secret password..."
                    className="font-mono"
                  />
                </div>

                <FormTextarea
                  label="Notes / Recovery Keys"
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Optional 2FA backup codes or instructions..."
                />

                <div className="flex items-center justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {modalSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Encrypting & Saving...</span>
                      </>
                    ) : (
                      <span>{editingEntry ? 'Update Secret' : 'Encrypt & Save'}</span>
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
