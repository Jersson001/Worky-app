/**
 * El cuerpo del Inicio: lo que una persona hace a diario, en el orden en que lo
 * hace.
 *
 * Antes eran dos cuadrículas de baldosas iguales —seis «acciones rápidas» y once
 * «herramientas»—, cada una de su color, sin un solo dato: Chats pesaba lo mismo
 * que Cámara, y nada decía cómo iba el negocio. Ahora:
 *
 * 1. **Hoy:** tres cifras que se tocan —chats sin leer, por cobrar, cotizaciones
 *    esperando respuesta—. Es lo que se hace primero: responder, cobrar, cotizar.
 * 2. **Chats:** los que esperan respuesta, con su último mensaje y «Responder».
 * 3. **Cotizar y cobrar:** los documentos.
 * 4. **Mi negocio:** finanzas, datos de pago, catálogo. El orden cambia con el
 *    negocio: quien vende de catálogo lo tiene arriba; quien cotiza obra, las
 *    finanzas.
 * 5. **Más:** lo que se usa de vez en cuando, plegado.
 *
 * Todo lo que abre algo viene por props: el Inicio no sabe de modales, solo de
 * orden. Los datos son reales; mientras llegan se ve «—», y si fallan también:
 * «no sé» no se pinta como «no hay nada».
 */
import React, { useEffect, useMemo, useState } from 'react';
import Tip from './ui/Tip';
import { useResumenInicio } from '../hooks/useResumenInicio';
import { cifraCorta, familiaDeNegocio, Pendiente } from '../utils/inicio';
import { fotoOIniciales } from '../utils/avatar';
import { formatCurrency } from '../utils/currency';
import type { Contact, UserProfileData } from '../types';

export type DocumentoDelInicio = 'quote' | 'invoice' | 'collection_account' | 'expense';

interface InicioPanelProps {
  contacts: Contact[];
  totalSinLeer: number;
  userProfile?: UserProfileData | null;
  onOpenChats: () => void;
  onOpenChat: (contactId: string) => void;
  onCrearDocumento: (tipo: DocumentoDelInicio) => void;
  onOpenFinancials: () => void;
  onOpenCatalog: () => void;
  onOpenWallet: () => void;
  onOpenGantt: () => void;
  onOpenStatus: (conCamara: boolean) => void;
  onOpenGroups: () => void;
  onOpenTiendas: () => void;
  onNewContact: () => void;
  onOpenAdmin: () => void;
  /** El generador de contratos trae su propio botón y su propio modal. */
  contratoSlot: React.ReactNode;
}

const ETIQUETA_DOCUMENTO: Record<Pendiente['tipo'], string> = {
  invoice: 'Factura',
  collection_account: 'Cuenta de cobro',
  quote: 'Cotización',
};

const ms = (v: Contact['lastMessageTime']): number => {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  const t = new Date(v as any).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const horaCorta = (v: Contact['lastMessageTime']): string => {
  if (v instanceof Date) return v.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (typeof v === 'number') return new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return typeof v === 'string' ? v : '';
};

const diasDesde = (fecha: Date): number =>
  Math.max(0, Math.floor((Date.now() - fecha.getTime()) / 86_400_000));

const hace = (fecha: Date): string => {
  const d = diasDesde(fecha);
  if (fecha.getTime() === 0) return '';
  if (d === 0) return 'hoy';
  if (d === 1) return 'ayer';
  return `hace ${d} días`;
};

// ── Piezas ───────────────────────────────────────────────────────────────

const Titulo: React.FC<{ children: React.ReactNode; derecha?: React.ReactNode }> = ({ children, derecha }) => (
  <div className="flex items-center justify-between mb-2.5">
    <h3 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">{children}</h3>
    {derecha}
  </div>
);

/** Una cifra de «Hoy». Sin nada que atender se apaga: no hay a dónde ir. */
const Cifra: React.FC<{
  icono: string;
  etiqueta: string;
  valor: string;
  detalle?: string;
  urgente?: boolean;
  activa: boolean;
  onClick: () => void;
}> = ({ icono, etiqueta, valor, detalle, urgente, activa, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!activa}
    className={`text-left rounded-2xl p-3 border transition min-w-0 ${
      urgente
        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25'
        : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    } ${activa ? 'hover:shadow-md active:scale-[0.98]' : 'cursor-default'}`}
  >
    <div className="flex items-center gap-1.5 mb-1.5">
      <i className={`fa-solid ${icono} text-[11px] ${urgente ? 'text-white/80' : 'text-slate-400'}`}></i>
      <span className={`text-[11px] font-semibold ${urgente ? 'text-white/85' : 'text-slate-500'}`}>{etiqueta}</span>
    </div>
    <div className="text-xl font-extrabold leading-tight truncate">{valor}</div>
    {detalle && <div className={`text-[11px] mt-0.5 truncate ${urgente ? 'text-white/80' : 'text-slate-500'}`}>{detalle}</div>}
  </button>
);

/** Baldosa de documento: conserva su color, que aquí sí dice qué documento es. */
const Documento: React.FC<{
  tipo: DocumentoDelInicio;
  titulo: string;
  subtitulo: string;
  tip: string;
  icono: string;
  color: string;
  onClick: (t: DocumentoDelInicio) => void;
}> = ({ tipo, titulo, subtitulo, tip, icono, color, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(tipo)}
    className="bg-white p-3.5 rounded-xl transition shadow-sm hover:shadow-md flex flex-col items-center gap-2 relative group"
  >
    <Tip text={tip} />
    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-md`}>
      <i className={`fa-solid ${icono} text-lg`}></i>
    </div>
    <div className="text-center">
      <div className="text-slate-800 text-[12.5px] font-semibold leading-tight">{titulo}</div>
      <div className="text-slate-500 text-[11px] leading-tight mt-0.5">{subtitulo}</div>
    </div>
  </button>
);

/** Baldosa de herramienta: neutra. El color queda para lo que significa algo. */
const Herramienta: React.FC<{
  icono: string;
  titulo: string;
  detalle?: React.ReactNode;
  tip: string;
  destacada?: boolean;
  onClick: () => void;
}> = ({ icono, titulo, detalle, tip, destacada, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-3 rounded-xl transition shadow-sm hover:shadow-md flex flex-col items-center gap-1.5 relative group ${
      destacada ? 'bg-blue-50 border border-blue-200' : 'bg-white'
    }`}
  >
    <Tip text={tip} />
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${destacada ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
      <i className={`fa-solid ${icono} text-base`}></i>
    </div>
    <span className="text-slate-700 text-[11.5px] font-semibold leading-tight text-center">{titulo}</span>
    {detalle && <span className="text-[11px] leading-tight text-center">{detalle}</span>}
  </button>
);

// ── Panel ────────────────────────────────────────────────────────────────

export const InicioPanel: React.FC<InicioPanelProps> = ({
  contacts, totalSinLeer, userProfile,
  onOpenChats, onOpenChat, onCrearDocumento, onOpenFinancials, onOpenCatalog, onOpenWallet,
  onOpenGantt, onOpenStatus, onOpenGroups, onOpenTiendas, onNewContact, onOpenAdmin, contratoSlot,
}) => {
  const familia = familiaDeNegocio(userProfile?.businessType);

  const conocidos = useMemo(
    () => contacts.map(c => ({ id: c.id, clientName: c.clientName, role: c.role })),
    [contacts],
  );
  const { datos, cargando } = useResumenInicio(conocidos);
  const pendientes = datos?.pendientes ?? null;
  const cajaDelMes = datos?.cajaDelMes ?? null;

  const [hoja, setHoja] = useState<'cobrar' | 'cotizaciones' | null>(null);
  const [mas, setMas] = useState(false);

  useEffect(() => {
    if (!hoja) return;
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') setHoja(null); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [hoja]);

  /** Los chats que esperan respuesta, el más reciente primero. */
  const esperando = useMemo(
    () => contacts
      .filter(c => (c.unreadCount || 0) > 0)
      .sort((a, b) => ms(b.lastMessageTime) - ms(a.lastMessageTime))
      .slice(0, 2),
    [contacts],
  );

  const nCobrar = pendientes?.porCobrar.items.length ?? 0;
  const nCotizaciones = pendientes?.cotizaciones.items.length ?? 0;
  const enCarga = cargando && !datos;

  const textoPorCobrar = enCarga || !pendientes ? '—' : nCobrar === 0 ? 'Al día' : cifraCorta(pendientes.porCobrar.total);
  const detallePorCobrar = !pendientes ? undefined : nCobrar === 0 ? 'Nada pendiente' : `${nCobrar} ${nCobrar === 1 ? 'documento' : 'documentos'}`;
  const textoCotizaciones = enCarga || !pendientes ? '—' : String(nCotizaciones);
  const detalleCotizaciones = !pendientes ? undefined : nCotizaciones === 0 ? 'Ninguna' : 'sin respuesta';

  // ── Mi negocio: el orden depende de a qué se dedica ──
  const esObra = familia === 'obra';
  const esComercio = familia === 'comercio';

  const cajaDetalle = (
    <span className={`font-bold ${cajaDelMes === null ? 'text-slate-400' : cajaDelMes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
      {cajaDelMes === null ? 'Caja: —' : `Caja ${cifraCorta(cajaDelMes)}`}
    </span>
  );

  const negocio = [
    {
      clave: 'catalogo',
      peso: esComercio ? 0 : 3,
      nodo: (
        <Herramienta key="catalogo" icono="fa-box-open" titulo="Catálogo" tip="Gestiona, publica tus productos y compártelos por QR"
          destacada={esComercio} detalle={esComercio ? <span className="text-blue-700 font-semibold">QR y enlace</span> : undefined} onClick={onOpenCatalog} />
      ),
    },
    {
      clave: 'finanzas',
      peso: esComercio ? 1 : 0,
      nodo: <Herramienta key="finanzas" icono="fa-chart-pie" titulo="Finanzas" tip="Ingresos, cobros y gastos del negocio" detalle={cajaDetalle} onClick={onOpenFinancials} />,
    },
    {
      clave: 'gasto',
      peso: esComercio ? 2 : 1,
      nodo: <Herramienta key="gasto" icono="fa-money-bill-transfer" titulo="Registrar gasto" tip="Anota gastos según proyecto asignado" onClick={() => onCrearDocumento('expense')} />,
    },
    ...(esObra ? [{
      clave: 'gantt',
      peso: 2,
      nodo: <Herramienta key="gantt" icono="fa-bars-progress" titulo="Gantt" tip="Cronograma visual de tus proyectos" onClick={onOpenGantt} />,
    }] : []),
    {
      clave: 'pagos',
      peso: 4,
      nodo: <Herramienta key="pagos" icono="fa-money-check-dollar" titulo="Datos de pago" tip="Tu número de cuenta y datos bancarios" onClick={onOpenWallet} />,
    },
  ].sort((a, b) => a.peso - b.peso);

  const sheetItems: Pendiente[] = hoja === 'cobrar' ? (pendientes?.porCobrar.items ?? []) : hoja === 'cotizaciones' ? (pendientes?.cotizaciones.items ?? []) : [];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 1. HOY */}
      <section>
        <Titulo>Hoy</Titulo>
        <div className="grid grid-cols-3 gap-2.5">
          <Cifra
            icono="fa-comment-dots" etiqueta="Sin leer"
            valor={String(totalSinLeer)} detalle={totalSinLeer === 0 ? 'Al día' : totalSinLeer === 1 ? 'chat' : 'mensajes'}
            urgente={totalSinLeer > 0} activa={true} onClick={onOpenChats}
          />
          <Cifra
            icono="fa-hand-holding-dollar" etiqueta="Por cobrar"
            valor={textoPorCobrar} detalle={detallePorCobrar}
            activa={nCobrar > 0} onClick={() => setHoja('cobrar')}
          />
          <Cifra
            icono="fa-file-invoice-dollar" etiqueta="Cotizaciones"
            valor={textoCotizaciones} detalle={detalleCotizaciones}
            activa={nCotizaciones > 0} onClick={() => setHoja('cotizaciones')}
          />
        </div>
      </section>

      {/* 2. CHATS */}
      <section>
        <Titulo
          derecha={
            <div className="flex items-center gap-3">
              <button type="button" onClick={onNewContact} className="text-[12px] font-bold text-blue-600 flex items-center gap-1" aria-label="Agregar un contacto">
                <i className="fa-solid fa-user-plus text-[11px]"></i> Contacto
              </button>
              <button type="button" onClick={onOpenChats} className="text-[12px] font-bold text-slate-500">Ver todos</button>
            </div>
          }
        >
          Chats
        </Titulo>

        {esperando.length === 0 ? (
          <button
            type="button" onClick={onOpenChats}
            className="w-full bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3 text-left hover:shadow-md transition"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">Estás al día con tus clientes</p>
              <p className="text-[12px] text-slate-500">No hay chats esperando respuesta.</p>
            </div>
            <i className="fa-solid fa-chevron-right text-[11px] text-slate-300"></i>
          </button>
        ) : (
          <div className="space-y-2">
            {esperando.map(c => (
              <button
                key={c.id} type="button" onClick={() => onOpenChat(c.id)}
                className="w-full bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center gap-3 text-left hover:shadow-md hover:border-blue-300 transition"
              >
                <div className="relative shrink-0">
                  <img src={fotoOIniciales(c.avatar, c.clientName)} alt="" className="w-11 h-11 rounded-full object-cover" />
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    {c.unreadCount > 99 ? '99+' : c.unreadCount}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate">{c.clientName}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{horaCorta(c.lastMessageTime)}</span>
                  </div>
                  <p className="text-[12.5px] text-slate-600 truncate">{c.lastMessage}</p>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[12px] font-bold shrink-0">Responder</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. COTIZAR Y COBRAR */}
      <section>
        <Titulo>Cotizar y cobrar</Titulo>
        <div className="grid grid-cols-2 min-[480px]:grid-cols-4 gap-2.5">
          <Documento tipo="quote" titulo="Cotización" subtitulo="Propuesta con precios" tip="Crea ofertas en segundos con imágenes y en PDF"
            icono="fa-file-invoice-dollar" color="from-blue-500 to-blue-600 shadow-blue-500/30" onClick={onCrearDocumento} />
          <Documento tipo="collection_account" titulo="Cuenta de cobro" subtitulo="Cobro sin IVA" tip="Crea una cuenta de cobro según proyecto asignado"
            icono="fa-hand-holding-dollar" color="from-emerald-500 to-emerald-600 shadow-emerald-500/30" onClick={onCrearDocumento} />
          <Documento tipo="invoice" titulo="Factura" subtitulo="Con IVA, para empresas" tip="Documento con IVA para empresas"
            icono="fa-file-invoice" color="from-indigo-500 to-indigo-600 shadow-indigo-500/30" onClick={onCrearDocumento} />
          {/* El botón del contrato es del generador: se estira para igualar la
              altura de las otras baldosas, que llevan un renglón más. */}
          <div className="relative group [&>button]:h-full [&>button]:justify-center">
            <Tip text="Genera contratos con firma digital" />
            {contratoSlot}
          </div>
        </div>
      </section>

      {/* 4. MI NEGOCIO */}
      <section>
        <Titulo>Mi negocio</Titulo>
        <div className="grid grid-cols-3 gap-2.5">
          {negocio.map(n => n.nodo)}
        </div>
      </section>

      {/* 5. MÁS */}
      <section>
        <button
          type="button" onClick={() => setMas(v => !v)}
          className="w-full flex items-center justify-between text-slate-500 text-[12px] font-bold py-2"
          aria-expanded={mas}
        >
          <span>Más herramientas</span>
          <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${mas ? 'rotate-180' : ''}`}></i>
        </button>
        {mas && (
          <div className="grid grid-cols-3 gap-2.5 mt-1">
            <Herramienta icono="fa-images" titulo="Historias" tip="Publica fotos de tus productos" onClick={() => onOpenStatus(false)} />
            <Herramienta icono="fa-camera" titulo="Cámara" tip="Toma una foto para una historia nueva" onClick={() => onOpenStatus(true)} />
            <Herramienta icono="fa-users-rectangle" titulo="Grupos" tip="Agrupa contactos por proyecto o categoría" onClick={onOpenGroups} />
            <Herramienta icono="fa-heart" titulo="Siguiendo" tip="Tiendas que sigues desde sus QR" onClick={onOpenTiendas} />
            {!esObra && <Herramienta icono="fa-bars-progress" titulo="Gantt" tip="Cronograma visual de tus proyectos" onClick={onOpenGantt} />}
            {userProfile?.isAdmin && <Herramienta icono="fa-user-shield" titulo="Admin" tip="Panel de administración de la plataforma" onClick={onOpenAdmin} />}
          </div>
        )}
      </section>

      {/* Hoja con el detalle de lo por cobrar o de las cotizaciones */}
      {hoja && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-slate-900/50" onClick={() => setHoja(null)}>
          <div
            role="dialog" aria-modal="true"
            className="bg-white w-full max-w-md max-h-[80vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {hoja === 'cobrar' ? 'Por cobrar' : 'Cotizaciones esperando respuesta'}
                </h3>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {hoja === 'cobrar'
                    ? `${formatCurrency(pendientes?.porCobrar.total ?? 0)} en ${sheetItems.length} ${sheetItems.length === 1 ? 'documento' : 'documentos'}. Lo más viejo, primero.`
                    : 'Las de los últimos 90 días que el cliente no ha aceptado ni rechazado.'}
                </p>
              </div>
              <button type="button" onClick={() => setHoja(null)} aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              {sheetItems.map(p => (
                <button
                  key={p.id} type="button" disabled={!p.contactoId}
                  onClick={() => { if (p.contactoId) { setHoja(null); onOpenChat(p.contactoId); } }}
                  className="w-full text-left p-3 rounded-xl hover:bg-slate-50 disabled:hover:bg-transparent flex items-center gap-3 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{p.cliente}</p>
                    <p className="text-[12px] text-slate-500 truncate">
                      {ETIQUETA_DOCUMENTO[p.tipo]}{p.numero ? ` ${p.numero}` : ''}{hace(p.fecha) ? ` · ${hace(p.fecha)}` : ''}
                      {p.vencida && <span className="ml-1.5 text-[10px] font-bold uppercase text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">vencida</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-slate-900">{formatCurrency(p.monto)}</p>
                    {p.contactoId && <p className="text-[11px] text-blue-600 font-semibold">Abrir chat</p>}
                  </div>
                </button>
              ))}
              {sheetItems.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">Nada pendiente.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InicioPanel;
