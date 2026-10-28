import React, { useEffect, useMemo, useState } from 'react';
import { AdminProfileRow, adminSetPro, adminSetSubscriptionEndsAt, listAllUserProfiles, mesDespuesDe } from '../services/adminService';
import { tieneAcceso } from './ProFeatureGuard';
import { crearCodigoReferido, enlaceDeReferido, reporteReferidos, type FilaReferidos } from '../services/referidosService';
import { catalogNfcUrl, qrImageUrl, tieneCatalogo, resumenVisitas, type ResumenVisitas } from '../services/catalogShareService';

interface AdminPanelProps {
  onClose: () => void;
}

const toDateInputValue = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

const isActive = (row: AdminProfileRow): boolean => tieneAcceso(row.isPro, row.trialEndsAt, row.subscriptionEndsAt);

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [rows, setRows] = useState<AdminProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dateDrafts, setDateDrafts] = useState<Record<string, string>>({});
  /** La tienda cuyo enlace NFC está abierto. */
  const [nfcAbierto, setNfcAbierto] = useState<string | null>(null);
  /** Si cada tienda tiene catálogo publicado; null mientras se pregunta. */
  const [conCatalogo, setConCatalogo] = useState<Record<string, boolean | null>>({});
  const [visitas, setVisitas] = useState<Record<string, ResumenVisitas[]>>({});
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Referidos: códigos que reparte quien trae gente, y cuánto trajo cada uno.
  const [refAbierto, setRefAbierto] = useState(false);
  const [referidos, setReferidos] = useState<FilaReferidos[] | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');

  const cargarReferidos = () =>
    reporteReferidos()
      .then((f) => { setReferidos(f); setRefError(null); })
      .catch((e: Error) => setRefError(e.message));

  const toggleReferidos = () => {
    setRefAbierto((a) => !a);
    if (referidos === null) void cargarReferidos();
  };

  const crearReferido = async () => {
    try {
      const creado = await crearCodigoReferido(nuevoCodigo, nuevoNombre);
      setRefError(creado ? null : 'Ese código ya existe.');
      if (creado) { setNuevoCodigo(''); setNuevoNombre(''); }
      await cargarReferidos();
    } catch (e) {
      setRefError((e as Error).message);
    }
  };

  const copiarReferido = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(enlaceDeReferido(codigo));
      setCopiadoId(`ref:${codigo}`);
      setTimeout(() => setCopiadoId((a) => (a === `ref:${codigo}` ? null : a)), 2000);
    } catch {
      /* sin portapapeles el enlace se puede armar a mano: ?ref=CODIGO */
    }
  };

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
      const activar = !row.isPro;
      const fin = activar ? mesDespuesDe(null) : null;
      await adminSetPro(row.id, activar, fin);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isPro: activar, subscriptionEndsAt: fin } : r)));
    } catch (e: any) {
      alert(e.message || 'Error actualizando');
    } finally {
      setSavingId(null);
    }
  };

  const handleRenovar = async (row: AdminProfileRow) => {
    setSavingId(row.id);
    try {
      const fin = mesDespuesDe(row.subscriptionEndsAt);
      await adminSetPro(row.id, true, fin);
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isPro: true, subscriptionEndsAt: fin } : r)));
    } catch (e: any) {
      alert(e.message || 'Error renovando');
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

  /**
   * Abre o cierra el enlace NFC de una tienda. Al abrirlo se comprueba que tenga
   * catálogo: una etiqueta que lleva a «No encontramos este catálogo» se graba y
   * se bloquea igual, y ya no se puede corregir.
   */
  const toggleNfc = (row: AdminProfileRow) => {
    if (nfcAbierto === row.id) { setNfcAbierto(null); return; }
    setNfcAbierto(row.id);
    if (visitas[row.id] === undefined) {
      resumenVisitas(30, row.id).then((v) => setVisitas((prev) => ({ ...prev, [row.id]: v })));
    }
    if (conCatalogo[row.id] === undefined) {
      setConCatalogo((prev) => ({ ...prev, [row.id]: null }));
      tieneCatalogo(row.id).then((si) => setConCatalogo((prev) => ({ ...prev, [row.id]: si })));
    }
  };

  const copiarEnlace = async (row: AdminProfileRow) => {
    try {
      await navigator.clipboard.writeText(catalogNfcUrl(row.id));
      setCopiadoId(row.id);
      setTimeout(() => setCopiadoId((actual) => (actual === row.id ? null : actual)), 2000);
    } catch {
      /* sin portapapeles el enlace está a la vista para copiarlo a mano */
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

        {/* Referidos */}
        <div className="px-4 py-2 border-b border-slate-100">
          <button onClick={toggleReferidos} className="text-xs font-bold text-slate-600 flex items-center gap-2">
            <i className={`fa-solid fa-chevron-${refAbierto ? 'down' : 'right'} text-[10px]`}></i>
            Referidos y comisiones
          </button>
          {refAbierto && (
            <div className="mt-3 space-y-3 pb-2">
              {refError && <p className="text-xs text-rose-600">{refError}</p>}
              <div className="flex flex-wrap gap-2">
                <input
                  value={nuevoCodigo} onChange={(e) => setNuevoCodigo(e.target.value)} placeholder="CÓDIGO (LEO)"
                  className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs uppercase outline-none focus:border-blue-500"
                />
                <input
                  value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Quién es"
                  className="flex-1 min-w-[8rem] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                />
                <button
                  onClick={crearReferido} disabled={!nuevoCodigo.trim()}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-40"
                >
                  Crear
                </button>
              </div>
              {referidos === null ? (
                <p className="text-xs text-slate-400">Cargando…</p>
              ) : referidos.length === 0 ? (
                <p className="text-xs text-slate-400">Aún no hay códigos.</p>
              ) : (
                <div className="space-y-1.5">
                  {referidos.map((f) => (
                    <div key={f.codigo} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{f.codigo} <span className="font-normal text-slate-500">· {f.nombre}</span></p>
                        <p className="text-[11px] text-slate-600">
                          {f.registrados} registrados · <b>{f.conMembresia} con membresía pagada</b> · {f.nuevos30d} en 30 días
                        </p>
                      </div>
                      <button
                        onClick={() => copiarReferido(f.codigo)}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 shrink-0"
                      >
                        {copiadoId === `ref:${f.codigo}` ? '¡Copiado!' : 'Copiar enlace'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-500 leading-snug">
                «Membresía pagada» es quien hoy tiene vigente la fecha de suscripción que pones al confirmar el pago; la prueba gratuita no cuenta. La comisión se calcula con ese número y el porcentaje que acuerden.
              </p>
            </div>
          )}
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

                      {row.isPro && (
                        <button
                          onClick={() => handleRenovar(row)}
                          disabled={savingId === row.id}
                          className="text-xs font-bold px-3 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 transition disabled:opacity-50"
                        >
                          Renovar +1 mes
                        </button>
                      )}

                      <div className="flex items-end gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Suscripción vence</label>
                          <input
                            key={row.subscriptionEndsAt}
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

                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => toggleNfc(row)}
                        className="text-xs font-bold px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2"
                      >
                        <i className="fa-solid fa-tag"></i>
                        Enlace NFC
                        <i className={`fa-solid ${nfcAbierto === row.id ? 'fa-chevron-up' : 'fa-chevron-down'} text-[9px]`}></i>
                      </button>

                      {nfcAbierto === row.id && (
                        <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-3">
                          {conCatalogo[row.id] === false && (
                            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2 leading-snug">
                              <b>Esta tienda no tiene catálogo publicado.</b> Quien toque la etiqueta
                              vería «No encontramos este catálogo». Que lo publique antes de grabarla.
                            </p>
                          )}
                          {conCatalogo[row.id] === null && (
                            <p className="text-xs text-slate-500">Comprobando que tenga catálogo…</p>
                          )}

                          <div className="flex items-start gap-3">
                            <img
                              src={qrImageUrl(catalogNfcUrl(row.id), 160)}
                              alt="QR de la tienda"
                              className="w-20 h-20 rounded-lg bg-white border border-slate-200 p-1 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Enlace para grabar</p>
                              <p className="text-xs text-slate-800 break-all select-all">{catalogNfcUrl(row.id)}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => copiarEnlace(row)}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/30 hover:shadow-lg transition"
                                >
                                  {copiadoId === row.id ? '¡Copiado!' : 'Copiar enlace'}
                                </button>
                                <a
                                  href={catalogNfcUrl(row.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
                                >
                                  Probar
                                </a>
                              </div>
                            </div>
                          </div>

                          {visitas[row.id] !== undefined && (
                            <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2">
                              <b>Últimos 30 días:</b>{' '}
                              {(['qr', 'nfc', 'enlace'] as const).map((via) => {
                                const f = visitas[row.id].find((x) => x.via === via);
                                return `${via === 'qr' ? 'QR' : via === 'nfc' ? 'NFC' : 'Enlace'} ${f?.visitas ?? 0}`;
                              }).join(' · ')}
                            </p>
                          )}

                          <p className="text-[11px] text-slate-500 leading-snug">
                            Graba este enlace en la etiqueta, <b>pruébala en un Android y en un iPhone</b> y
                            solo al final bloquéala contra escritura: el bloqueo no se deshace. Lleva el
                            QR impreso como respaldo.
                          </p>
                        </div>
                      )}
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
