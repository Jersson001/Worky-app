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
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-10 md:pt-16 bg-slate-900/40 animate-fade-in" onClick={onClose}>
      <div
        className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
              <i className="fa-solid fa-user-shield text-lg"></i>
            </div>
            <h3 className="text-slate-900 font-bold text-lg">Panel de Suscripciones</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition">
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-white">
          {loading ? (
            <div className="text-slate-400 text-sm text-center py-10">Cargando usuarios...</div>
          ) : error ? (
            <div className="text-rose-500 text-sm text-center py-10">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-10">Sin resultados.</div>
          ) : (
            <div className="space-y-3">
              {filteredRows.map((row) => {
                const active = isActive(row);
                return (
                  <div key={row.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-slate-900 text-sm font-bold truncate">
                          {row.businessName || row.ownerName || 'Sin nombre'}
                        </p>
                        <p className="text-slate-500 text-xs truncate">{row.email || row.phone || row.id}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full whitespace-nowrap ${
                          active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
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
                            ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-500/30 hover:shadow-lg'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          onClick={() => handleSaveDate(row)}
                          disabled={savingId === row.id}
                          className="text-xs font-bold px-3 py-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30 hover:shadow-lg transition disabled:opacity-50"
                        >
                          Guardar
                        </button>
                      </div>

                      <p className="text-[10px] text-slate-400 ml-auto">
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
