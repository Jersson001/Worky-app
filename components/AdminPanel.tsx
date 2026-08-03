import React, { useEffect, useMemo, useState } from 'react';
import { AdminProfileRow, adminSetPro, adminSetSubscriptionEndsAt, listAllUserProfiles } from '../services/adminService';

interface AdminPanelProps {
  onClose: () => void;
}

const toDateInputValue = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

const isActive = (row: AdminProfileRow): boolean => {
  if (row.isPro) return true;
  const trialActive = row.trialEndsAt ? new Date(row.trialEndsAt).getTime() > Date.now() : true;
  const subActive = row.subscriptionEndsAt ? new Date(row.subscriptionEndsAt).getTime() > Date.now() : false;
  return trialActive || subActive;
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [rows, setRows] = useState<AdminProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAllUserProfiles();
      setRows(data);
    } catch (e: any) {
      setError(e.message || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.businessName, r.ownerName, r.email, r.phone].filter(Boolean).some((v) => v!.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const handleTogglePro = async (row: AdminProfileRow) => {
    setSavingId(row.id);
    try {
      await adminSetPro(row.id, !row.isPro);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isPro: !r.isPro } : r)));
    } catch (e: any) {
      alert(e.message || 'Error actualizando');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveDate = async (row: AdminProfileRow) => {
    const draft = dateDrafts[row.id];
    const isoDate = draft ? new Date(`${draft}T23:59:59`).toISOString() : null;
    setSavingId(row.id);
    try {
      await adminSetSubscriptionEndsAt(row.id, isoDate);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, subscriptionEndsAt: isoDate } : r)));
    } catch (e: any) {
      alert(e.message || 'Error actualizando fecha');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-10 md:pt-16 bg-slate-950/80 animate-fade-in backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-800 w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex justify-between items-center p-5 border-b border-slate-700/50"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
              <i className="fa-solid fa-user-shield text-lg"></i>
            </div>
            <h3 className="text-white font-bold text-lg">Panel de Suscripciones</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/30">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono..."
            className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-900/30">
          {loading ? (
            <div className="text-slate-400 text-sm text-center py-10">Cargando usuarios...</div>
          ) : error ? (
            <div className="text-rose-400 text-sm text-center py-10">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-10">Sin resultados.</div>
          ) : (
            <div className="space-y-3">
              {filteredRows.map((row) => {
                const active = isActive(row);
                return (
                  <div key={row.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-slate-100 text-sm font-bold truncate">
                          {row.businessName || row.ownerName || 'Sin nombre'}
                        </p>
                        <p className="text-slate-500 text-xs truncate">{row.email || row.phone || row.id}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full whitespace-nowrap ${
                          active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {active ? 'Activo' : 'Bloqueado'}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <button
                        onClick={() => handleTogglePro(row)}
                        disabled={savingId === row.id}
                        className={`text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-50 ${
                          row.isPro
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {row.isPro ? 'Pro activo (clic para quitar)' : 'Marcar como Pro'}
                      </button>

                      <div className="flex items-end gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Suscripción vence</label>
                          <input
                            type="date"
                            defaultValue={toDateInputValue(row.subscriptionEndsAt)}
                            onChange={(e) => setDateDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            className="bg-slate-900 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/50"
                          />
                        </div>
                        <button
                          onClick={() => handleSaveDate(row)}
                          disabled={savingId === row.id}
                          className="text-xs font-bold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                        >
                          Guardar
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-500 ml-auto">
                        Trial hasta {row.trialEndsAt ? new Date(row.trialEndsAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
