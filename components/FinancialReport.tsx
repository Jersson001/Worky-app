import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Contact } from '../types';
import { cargarDatosFinancieros } from '../services/finanzasService';
import {
  anosConDatos, CategoriaGasto, cobradoPorProyecto, DatosFinancieros, finDeMes, inicioDeMes,
  Movimiento, NOMBRE_CATEGORIA, porMes, Resumen, resumir, Venta,
} from '../utils/finanzas';

interface FinancialReportProps {
  contacts: Contact[];
  onClose: () => void;
}

type Vista = 'monthly' | 'yearly' | 'ledger' | 'custom';

const TITULO: Record<Vista, string> = {
  monthly: 'Reporte Mensual',
  yearly: 'Resumen Anual',
  ledger: 'Movimientos',
  custom: 'Rango Personalizado',
};

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

/**
 * Una fecha `AAAA-MM-DD` de un `<input type="date">`, en hora local.
 *
 * `new Date('2026-09-01')` la lee en UTC, y en Colombia eso es el 31 de agosto
 * a las siete de la noche: el rango se comía el último día.
 */
const fechaLocal = (s: string, finDelDia = false) => {
  const [a, m, d] = s.split('-').map(Number);
  return finDelDia ? new Date(a, m - 1, d, 23, 59, 59, 999) : new Date(a, m - 1, d);
};
const aInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** «septiembre de 2026» → «Septiembre de 2026». Con `capitalize` salía «Septiembre De 2026». */
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const FinancialReport: React.FC<FinancialReportProps> = ({ contacts, onClose }) => {
  const [view, setView] = useState<Vista>('monthly');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [yearlySubView, setYearlySubView] = useState<'revenue' | 'expenses'>('revenue');
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [startDate, setStartDate] = useState(() => aInput(inicioDeMes(new Date())));
  const [endDate, setEndDate] = useState(() => aInput(new Date()));

  const [datos, setDatos] = useState<DatosFinancieros | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Los nombres salen de los contactos en memoria, pero las cifras no: se piden
  // a la base al abrir. Se lee `contacts` por referencia estable para no volver
  // a pedirlo todo cada vez que llega un mensaje y cambia la lista.
  const contactosRef = React.useRef(contacts);
  contactosRef.current = contacts;

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await cargarDatosFinancieros(
        contactosRef.current.map(c => ({ id: c.id, clientName: c.clientName, role: c.role })),
      ));
    } catch (e: any) {
      console.error('Error cargando los estados financieros:', e);
      setError(e?.message || 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const vacio: DatosFinancieros = { ventas: [], movimientos: [] };
  const d = datos ?? vacio;

  const hoy = new Date();
  const mesActual = useMemo(() => resumir(d, inicioDeMes(hoy), finDeMes(hoy)), [datos]);
  const meses = useMemo(() => porMes(d).slice(0, 12), [datos]);
  const anos = useMemo(() => anosConDatos(d), [datos]);
  const cobrado = useMemo(() => cobradoPorProyecto(d), [datos]);

  const inicioAno = new Date(ano, 0, 1);
  const finAno = new Date(ano, 11, 31, 23, 59, 59, 999);
  const resumenAno = useMemo(() => resumir(d, inicioAno, finAno), [datos, ano]);
  const ventasAno = useMemo(() => d.ventas.filter(v => v.fecha >= inicioAno && v.fecha <= finAno), [datos, ano]);
  const gastosAno = useMemo(
    () => d.movimientos.filter(m => m.tipo === 'gasto' && m.fecha >= inicioAno && m.fecha <= finAno), [datos, ano]);
  const porCobrarAno = ventasAno.reduce((s, v) => s + Math.max(0, v.valor - (cobrado.get(v.id) || 0)), 0);

  const rango = useMemo(() => {
    if (!startDate || !endDate) return null;
    const desde = fechaLocal(startDate);
    const hasta = fechaLocal(endDate, true);
    return {
      resumen: resumir(d, desde, hasta),
      movimientos: d.movimientos.filter(m => m.fecha >= desde && m.fecha <= hasta),
    };
  }, [datos, startDate, endDate]);

  // Filtro por id, no por nombre: dos proyectos «Cocina» del mismo cliente son
  // dos proyectos.
  const proyectos = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of d.ventas) m.set(v.id, `${v.cliente} - ${v.proyecto}`);
    for (const mov of d.movimientos) if (mov.proyectoId && !m.has(mov.proyectoId)) m.set(mov.proyectoId, `${mov.cliente} - ${mov.proyecto}`);
    return Array.from(m.entries());
  }, [datos]);

  const movimientosLedger = useMemo(() => {
    if (projectFilter === 'all') return d.movimientos;
    if (projectFilter === 'none') return d.movimientos.filter(m => !m.proyectoId);
    return d.movimientos.filter(m => m.proyectoId === projectFilter);
  }, [datos, projectFilter]);

  const maxMes = Math.max(1, ...meses.map(m => Math.max(m.cobrado, m.gastos)));
  const sinNada = !cargando && !error && d.ventas.length === 0 && d.movimientos.length === 0;

  // ── Impresión ───────────────────────────────────────────────────────────
  const filasResumen = (r: Resumen, porCobrar?: number) => `
    <div class="summary-row"><span>Vendido</span><span>${formatCurrency(r.vendido)}</span></div>
    <div class="summary-row"><span>Cobrado</span><span class="amount-income">${formatCurrency(r.cobrado)}</span></div>
    ${porCobrar !== undefined ? `<div class="summary-row"><span>Por cobrar</span><span>${formatCurrency(porCobrar)}</span></div>` : ''}
    <div class="summary-row"><span>Gastos</span><span class="amount-expense">${formatCurrency(r.gastos)}</span></div>
    <div class="summary-row"><span>Caja (cobrado − gastos)</span><span class="${r.caja >= 0 ? 'amount-income' : 'amount-expense'}">${formatCurrency(r.caja)}</span></div>`;

  const tablaMovimientos = (movs: Movimiento[]) => movs.length === 0
    ? '<p style="text-align:center;color:#64748b;padding:40px;">No hay movimientos para mostrar.</p>'
    : `<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Cliente</th><th>Proyecto</th><th>Monto</th></tr></thead><tbody>
      ${movs.map(t => `<tr>
        <td>${t.fecha.toLocaleDateString('es-CO')}</td>
        <td>${t.tipo === 'cobro' ? 'Cobro' : 'Gasto'}</td>
        <td>${escapar(t.concepto)}</td>
        <td>${escapar(t.cliente)}</td>
        <td>${escapar(t.proyecto)}</td>
        <td class="${t.tipo === 'cobro' ? 'amount-income' : 'amount-expense'}">${t.tipo === 'cobro' ? '+' : '-'}${formatCurrency(t.monto)}</td>
      </tr>`).join('')}</tbody></table>`;

  const generatePrintContent = (): string => {
    if (view === 'monthly') {
      return `<div class="summary-box"><h2 style="margin-top:0">${mayuscula(hoy.toLocaleString('es-CO', { month: 'long', year: 'numeric' }))}</h2>${filasResumen(mesActual)}</div>
        ${meses.length ? `<h2>Historial de meses</h2><table><thead><tr><th>Mes</th><th>Vendido</th><th>Cobrado</th><th>Gastos</th><th>Caja</th></tr></thead><tbody>
        ${meses.map(m => `<tr><td>${mayuscula(m.etiqueta)}</td><td>${formatCurrency(m.vendido)}</td><td class="amount-income">${formatCurrency(m.cobrado)}</td><td class="amount-expense">${formatCurrency(m.gastos)}</td><td class="${m.caja >= 0 ? 'amount-income' : 'amount-expense'}">${formatCurrency(m.caja)}</td></tr>`).join('')}
        </tbody></table>` : ''}`;
    }
    if (view === 'yearly') {
      let c = `<div class="summary-box"><h2 style="margin-top:0">Año ${ano}</h2>${filasResumen(resumenAno, porCobrarAno)}</div>`;
      if (yearlySubView === 'revenue') {
        c += ventasAno.length ? `<h2>Ventas</h2><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Proyecto</th><th>Valor</th><th>Cobrado</th><th>Por cobrar</th></tr></thead><tbody>
          ${ventasAno.map(v => { const co = cobrado.get(v.id) || 0; return `<tr><td>${v.fecha.toLocaleDateString('es-CO')}</td><td>${escapar(v.cliente)}</td><td>${escapar(v.proyecto)}</td><td>${formatCurrency(v.valor)}</td><td class="amount-income">${formatCurrency(co)}</td><td>${formatCurrency(Math.max(0, v.valor - co))}</td></tr>`; }).join('')}
          </tbody></table>` : '';
      } else {
        c += resumenAno.gastos > 0 ? `<h2>Gastos por categoría</h2><table><thead><tr><th>Categoría</th><th>Monto</th><th>%</th></tr></thead><tbody>
          ${(Object.entries(resumenAno.porCategoria) as [CategoriaGasto, number][]).filter(([, v]) => v > 0).map(([k, v]) => `<tr><td>${NOMBRE_CATEGORIA[k]}</td><td class="amount-expense">${formatCurrency(v)}</td><td>${((v / resumenAno.gastos) * 100).toFixed(1)}%</td></tr>`).join('')}
          </tbody></table>` : '';
        c += `<h2>Historial de gastos</h2>${tablaMovimientos(gastosAno)}`;
      }
      return c;
    }
    if (view === 'custom' && rango) {
      return `<div class="summary-box"><h2 style="margin-top:0">Del ${fechaLocal(startDate).toLocaleDateString('es-CO')} al ${fechaLocal(endDate).toLocaleDateString('es-CO')}</h2>${filasResumen(rango.resumen)}</div>
        <h2>Movimientos del rango</h2>${tablaMovimientos(rango.movimientos)}`;
    }
    const filtro = projectFilter === 'all' ? '' : `<p style="color:#64748b"><strong>Filtro:</strong> ${escapar(projectFilter === 'none' ? 'Sin proyecto' : proyectos.find(([id]) => id === projectFilter)?.[1] || '')}</p>`;
    return `<h2>Movimientos</h2>${filtro}${tablaMovimientos(movimientosLedger)}`;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head>
      <title>${TITULO[view]} - Estados Financieros</title><meta charset="UTF-8">
      <style>
        @page { margin: 1.5cm; size: A4; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; }
        .print-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #475569; }
        .print-header h1 { font-size: 28px; margin: 0 0 10px; color: #0f172a; }
        .print-header p, .print-date { color: #64748b; }
        .print-date { text-align: right; font-size: 11px; margin-bottom: 25px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        tr { page-break-inside: avoid; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
        .amount-income { color: #059669; font-weight: bold; }
        .amount-expense { color: #dc2626; font-weight: bold; }
        .summary-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; page-break-inside: avoid; }
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .summary-row:last-child { border-bottom: none; font-weight: bold; font-size: 15px; }
        h2 { font-size: 17px; color: #0f172a; margin: 25px 0 12px; page-break-after: avoid; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="print-header"><h1>Estados Financieros</h1><p>${TITULO[view]}</p></div>
      <div class="print-date">Generado el ${hoy.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      ${generatePrintContent()}
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  // ── Piezas ──────────────────────────────────────────────────────────────
  const tarjetas = (r: Resumen, porCobrar?: number) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Tarjeta etiqueta="Vendido" valor={r.vendido} icono="fa-handshake" color="text-slate-800" ayuda="Proyectos cerrados" />
      <Tarjeta etiqueta="Cobrado" valor={r.cobrado} icono="fa-money-bill-wave" color="text-emerald-600"
        ayuda={porCobrar !== undefined ? `Por cobrar ${formatCurrency(porCobrar)}` : 'Plata que entró'} />
      <Tarjeta etiqueta="Gastos" valor={r.gastos} icono="fa-receipt" color="text-rose-600" ayuda="Lo que costó" />
      <Tarjeta etiqueta="Caja" valor={r.caja} icono="fa-sack-dollar" color={r.caja >= 0 ? 'text-emerald-600' : 'text-rose-600'} ayuda="Cobrado − gastos" />
    </div>
  );

  const listaMovimientos = (movs: Movimiento[], vacio: string) => (
    <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
      {movs.length === 0 && <div className="text-center py-8 text-slate-400 italic">{vacio}</div>}
      {movs.map(t => (
        <div key={t.id} className="bg-white p-4 rounded-xl flex justify-between items-center gap-3 border border-slate-100">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${t.tipo === 'cobro' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
              <i className={`fa-solid ${t.tipo === 'cobro' ? 'fa-money-bill-wave' : 'fa-receipt'}`}></i>
            </div>
            <div className="min-w-0">
              <div className="text-slate-800 font-bold text-sm truncate">{t.concepto}</div>
              <div className="text-slate-400 text-xs font-medium flex flex-wrap gap-x-2">
                <span>{t.fecha.toLocaleDateString('es-CO')}</span>
                <span>•</span>
                <span className="text-slate-600 font-bold">{t.cliente}</span>
                <span>•</span>
                <span className={t.proyectoId ? 'text-indigo-500' : 'text-slate-400 italic'}>{t.proyecto}</span>
                {t.categoria && <><span>•</span><span>{NOMBRE_CATEGORIA[t.categoria]}</span></>}
              </div>
            </div>
          </div>
          <div className={`font-bold font-mono whitespace-nowrap ${t.tipo === 'cobro' ? 'text-emerald-600' : 'text-rose-500'}`}>
            {t.tipo === 'cobro' ? '+' : '-'}{formatCurrency(t.monto)}
          </div>
        </div>
      ))}
    </div>
  );

  const filaVenta = (v: Venta) => {
    const co = cobrado.get(v.id) || 0;
    const pct = v.valor > 0 ? Math.min(100, (co / v.valor) * 100) : 0;
    return (
      <div key={v.id} className="bg-white p-4 rounded-xl border border-slate-100">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="font-bold text-slate-800 text-sm truncate">{v.proyecto}</div>
            <div className="text-xs text-slate-500 mt-1">{v.cliente} • {v.fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}{v.etapa ? ` • ${v.etapa}` : ''}</div>
          </div>
          <div className="text-slate-800 font-bold whitespace-nowrap">{formatCurrency(v.valor)}</div>
        </div>
        <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] font-semibold">
          <span className="text-emerald-600">Cobrado {formatCurrency(co)}</span>
          <span className={co >= v.valor ? 'text-emerald-600' : 'text-slate-500'}>
            {co >= v.valor ? 'Cobrado por completo' : `Falta ${formatCurrency(v.valor - co)}`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex justify-center items-start pt-10 px-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="hidden sm:flex w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/30 flex-shrink-0">
              <i className="fa-solid fa-chart-pie"></i>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">Estados Financieros</h2>
              <p className="hidden sm:block text-slate-500 text-[13px]">Lo vendido, lo cobrado y lo gastado</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => void cargar()} disabled={cargando} title="Volver a cargar"
              className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 w-9 h-9 rounded-full flex items-center justify-center transition disabled:opacity-50">
              <i className={`fa-solid fa-rotate-right ${cargando ? 'animate-spin' : ''}`}></i>
            </button>
            <button onClick={handlePrint} disabled={cargando || !!error}
              className="bg-gradient-to-br from-blue-600 to-blue-700 hover:shadow-lg text-white px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 shadow-md shadow-blue-500/30 disabled:opacity-50"
              title="Imprimir o guardar como PDF">
              <i className="fa-solid fa-print"></i>
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition bg-slate-100 hover:bg-slate-200 w-9 h-9 rounded-full flex items-center justify-center">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 p-1 mx-4 sm:mx-6 mt-4 rounded-xl overflow-x-auto">
          {(Object.keys(TITULO) as Vista[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-2.5 px-2 text-sm font-bold transition rounded-lg whitespace-nowrap ${view === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {v === 'custom' && <i className="fa-regular fa-calendar-days mr-2"></i>}
              {TITULO[v]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-white">
          {cargando && !datos && (
            <div className="py-16 text-center text-slate-400">
              <i className="fa-solid fa-circle-notch animate-spin text-2xl mb-3"></i>
              <p className="text-sm">Sumando ventas, cobros y gastos…</p>
            </div>
          )}

          {error && (
            <div className="py-10 text-center">
              <p className="text-rose-600 font-semibold mb-1">No se pudieron cargar los datos</p>
              <p className="text-slate-500 text-sm mb-4">{error}</p>
              <button onClick={() => void cargar()} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold">Reintentar</button>
            </div>
          )}

          {sinNada && (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-5 text-sm text-slate-600">
              <p className="font-bold text-slate-800 mb-2">Todavía no hay nada que sumar</p>
              <ul className="space-y-1 list-disc pl-5">
                <li><b>Vendido</b>: cada cotización que te aprueban crea un proyecto con su valor.</li>
                <li><b>Cobrado</b>: los recibos de caja, y las cuentas de cobro y facturas que marques como pagadas.</li>
                <li><b>Gastos</b>: «Registrar gasto» desde el chat del cliente.</li>
              </ul>
            </div>
          )}

          {datos && !error && (
            <>
              {/* MONTHLY */}
              {view === 'monthly' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-slate-500 font-bold text-xs tracking-widest mb-4">
                      {mayuscula(hoy.toLocaleString('es-CO', { month: 'long', year: 'numeric' }))}
                    </h3>
                    {tarjetas(mesActual)}
                  </div>

                  {meses.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest">Últimos meses</h3>
                        <div className="flex gap-3 text-[11px] font-semibold text-slate-500">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>Cobrado</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>Gastos</span>
                        </div>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {meses.map(m => (
                          <div key={m.clave} className="min-w-[120px] bg-slate-50 p-4 rounded-xl flex flex-col items-center justify-end h-64 border border-slate-100 flex-1 group">
                            <div className="flex gap-3 items-end h-36 w-full justify-center mb-3">
                              <div className="w-6 bg-emerald-500 rounded-t-md" style={{ height: `${(m.cobrado / maxMes) * 100}%` }} title={`Cobrado ${formatCurrency(m.cobrado)}`}></div>
                              <div className="w-6 bg-rose-500 rounded-t-md" style={{ height: `${(m.gastos / maxMes) * 100}%` }} title={`Gastos ${formatCurrency(m.gastos)}`}></div>
                            </div>
                            <span className="text-slate-600 font-bold text-sm">{mayuscula(m.etiqueta)}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">Vendido {formatCurrency(m.vendido)}</span>
                            <div className="text-[11px] font-medium mt-1 bg-white px-2 py-0.5 rounded border border-slate-100">
                              <span className={m.caja >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatCurrency(m.caja)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* YEARLY */}
              {view === 'yearly' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest">Año</h3>
                    <select value={ano} onChange={e => setAno(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                      {anos.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  {tarjetas(resumenAno, porCobrarAno)}

                  <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setYearlySubView('revenue')}
                      className={`flex-1 py-3 px-4 rounded-md font-semibold text-sm transition ${yearlySubView === 'revenue' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <i className="fa-solid fa-arrow-trend-up mr-2"></i>Ventas
                    </button>
                    <button onClick={() => setYearlySubView('expenses')}
                      className={`flex-1 py-3 px-4 rounded-md font-semibold text-sm transition ${yearlySubView === 'expenses' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <i className="fa-solid fa-arrow-trend-down mr-2"></i>Gastos
                    </button>
                  </div>

                  {yearlySubView === 'revenue' && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <h4 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-handshake text-emerald-600"></i>
                        Proyectos vendidos en {ano}
                      </h4>
                      <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar">
                        {ventasAno.length === 0
                          ? <div className="text-center py-8 text-slate-400 italic">No hay ventas en {ano}.</div>
                          : ventasAno.map(filaVenta)}
                      </div>
                    </div>
                  )}

                  {yearlySubView === 'expenses' && (
                    <div className="space-y-6">
                      {resumenAno.gastos > 0 && (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <h4 className="text-slate-800 font-bold mb-5 flex items-center gap-2">
                            <i className="fa-solid fa-chart-pie text-rose-600"></i>Desglose de gastos
                          </h4>
                          <div className="space-y-4">
                            {(Object.entries(resumenAno.porCategoria) as [CategoriaGasto, number][]).filter(([, v]) => v > 0).map(([cat, monto]) => (
                              <div key={cat} className="flex items-center gap-4">
                                <div className="w-28 text-xs font-bold text-slate-500 uppercase text-right">{NOMBRE_CATEGORIA[cat]}</div>
                                <div className="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(monto / resumenAno.gastos) * 100}%` }}></div>
                                </div>
                                <div className="w-28 text-right text-slate-800 text-sm font-bold font-mono">{formatCurrency(monto)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <h4 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                          <i className="fa-solid fa-receipt text-rose-600"></i>Historial de gastos
                        </h4>
                        {listaMovimientos(gastosAno, `No hay gastos en ${ano}.`)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LEDGER */}
              {view === 'ledger' && (
                <div className="space-y-4">
                  <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
                    className="w-full bg-slate-50 text-slate-700 text-sm font-medium rounded-lg p-3 outline-none border border-slate-200 focus:border-indigo-500 cursor-pointer">
                    <option value="all">📁 Todos los proyectos</option>
                    {proyectos.map(([id, nombre]) => <option key={id} value={id}>📁 {nombre}</option>)}
                    {d.movimientos.some(m => !m.proyectoId) && <option value="none">📄 Cobros sin proyecto</option>}
                  </select>
                  {listaMovimientos(movimientosLedger, "No hay movimientos para mostrar.")}
                </div>
              )}

              {/* CUSTOM */}
              {view === 'custom' && (
                <div className="space-y-6">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="block">
                        <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Desde</span>
                        <input type="date" value={startDate} max={endDate} onChange={e => setStartDate(e.target.value)}
                          className="w-full bg-white text-slate-700 rounded-lg p-3 border border-slate-200 outline-none focus:border-indigo-500" />
                      </label>
                      <label className="block">
                        <span className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Hasta</span>
                        <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                          className="w-full bg-white text-slate-700 rounded-lg p-3 border border-slate-200 outline-none focus:border-indigo-500" />
                      </label>
                    </div>
                  </div>
                  {rango && (
                    <>
                      {tarjetas(rango.resumen)}
                      {listaMovimientos(rango.movimientos, "No hay movimientos en este rango.")}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Tarjeta: React.FC<{ etiqueta: string; valor: number; icono: string; color: string; ayuda: string }> =
  ({ etiqueta, valor, icono, color, ayuda }) => (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 sm:p-4 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{etiqueta}</span>
        <i className={`fa-solid ${icono} text-slate-300`}></i>
      </div>
      {/* Sin `truncate`: una cifra cortada en «$ 54.548.8…» es peor que ninguna. */}
      <div className={`text-[15px] sm:text-lg md:text-xl font-bold tabular-nums break-words ${color}`}>{formatCurrency(valor)}</div>
      <div className="text-[11px] text-slate-400 mt-1 truncate">{ayuda}</div>
    </div>
  );
