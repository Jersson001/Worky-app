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
 * 2. **Vitrina:** el catálogo y su QR, en una tarjeta grande. Es lo que trae
 *    clientes nuevos, y como baldosa era una más entre once.
 * 3. **Chats:** los que esperan respuesta, con su último mensaje y «Responder».
 * 4. **Cotizar y cobrar:** los documentos.
 * 5. **Mi negocio:** finanzas, gastos, datos de pago y, para quien cotiza obra,
 *    el Gantt.
 * 6. **Más:** lo que se usa de vez en cuando, plegado.
 *
 * Todo lo que abre algo viene por props: el Inicio no sabe de modales, solo de
 * orden. Los datos son reales; mientras llegan se ve «—», y si fallan también:
 * «no sé» no se pinta como «no hay nada».
 */
import React, { useEffect, useMemo, useState } from 'react';
import Tip from './ui/Tip';
import {
  ArrowLeftRight, BookUser, Camera, CheckCircle2, ChevronDown, ChevronRight, ChartGantt, ChartPie, CreditCard, Eye,
  FileText, HandCoins, Heart, Images, MessageCircle, Plus, QrCode, Receipt, ShieldCheck, Store, UserPlus,
  Users, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useResumenInicio } from '../hooks/useResumenInicio';
import { aMs as ms, cifraCorta, familiaDeNegocio, horaCorta, Pendiente } from '../utils/inicio';
import { fotoOIniciales } from '../utils/avatar';
import { formatCurrency } from '../utils/currency';
import { tieneCatalogo } from '../services/catalogShareService';
import { getCurrentUserId } from '../services/messagingService';
import type { Contact, UserProfileData } from '../types';

export type DocumentoDelInicio = 'quote' | 'invoice' | 'collection_account' | 'expense';

interface InicioPanelProps {
  contacts: Contact[];
  totalSinLeer: number;
  userProfile?: UserProfileData | null;
  /** Cuántos productos y carpetas tiene el catálogo: lo que la tarjeta cuenta. */
  productCount: number;
  folderCount: number;
  onOpenChats: () => void;
  onOpenChat: (contactId: string) => void;
  onCrearDocumento: (tipo: DocumentoDelInicio) => void;
  onOpenFinancials: () => void;
  /** Abre el administrador del catálogo. */
  onOpenCatalog: () => void;
  /** Abre el administrador con el formulario de producto nuevo ya abierto. */
  onAddProduct: () => void;
  /** Abre el QR y el enlace del catálogo. */
  onShareQr: () => void;
  onOpenWallet: () => void;
  onOpenGantt: () => void;
  onOpenStatus: (conCamara: boolean) => void;
  onOpenGroups: () => void;
  onOpenTiendas: () => void;
  onNewContact: () => void;
  /** Abre el directorio: todos los contactos, por orden alfabético y con buscador. */
  onOpenContactos: () => void;
  onOpenAdmin: () => void;
  /** El generador de contratos trae su propio botón y su propio modal. */
  contratoSlot: React.ReactNode;
}

/** Trazo de todos los iconos del Inicio. Fino: con el grueso de Font Awesome varios no se entendían. */
const TRAZO = 1.75;

const ETIQUETA_DOCUMENTO: Record<Pendiente['tipo'], string> = {
  invoice: 'Factura',
  collection_account: 'Cuenta de cobro',
  quote: 'Cotización',
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
    <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">{children}</h3>
    {derecha}
  </div>
);

/** Una cifra de «Hoy». Sin nada que atender se apaga: no hay a dónde ir. */
const Cifra: React.FC<{
  icono: LucideIcon;
  etiqueta: string;
  valor: string;
  detalle?: string;
  urgente?: boolean;
  activa: boolean;
  onClick: () => void;
}> = ({ icono: Icono, etiqueta, valor, detalle, urgente, activa, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!activa}
    className={`text-left rounded-2xl p-3 border transition min-w-0 ${
      urgente
        ? 'bg-rey-600 border-rey-600 text-white shadow-md shadow-rey-600/30'
        : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    } ${activa ? 'hover:shadow-md active:scale-[0.98]' : 'cursor-default'}`}
  >
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icono size={15} strokeWidth={TRAZO} className={urgente ? 'text-white/85' : 'text-rey-600'} />
      <span className={`text-[11px] font-semibold ${urgente ? 'text-white/90' : 'text-slate-500'}`}>{etiqueta}</span>
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
  icono: LucideIcon;
  /** Fondo del icono, sólido y saturado: es lo que distingue un documento de otro. */
  color: string;
  onClick: (t: DocumentoDelInicio) => void;
}> = ({ tipo, titulo, subtitulo, tip, icono: Icono, color, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(tipo)}
    className="bg-white p-3.5 rounded-xl transition shadow-sm hover:shadow-md flex flex-col items-center gap-2 relative group"
  >
    <Tip text={tip} />
    <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center text-white shadow-md`}>
      <Icono size={22} strokeWidth={TRAZO} />
    </div>
    <div className="text-center">
      <div className="text-slate-800 text-[12.5px] font-semibold leading-tight">{titulo}</div>
      <div className="text-slate-500 text-[11px] leading-tight mt-0.5">{subtitulo}</div>
    </div>
  </button>
);

/** Baldosa de herramienta: el icono lleva el azul rey sobre un fondo suave; el color fuerte queda para los documentos. */
const Herramienta: React.FC<{
  icono: LucideIcon;
  titulo: string;
  detalle?: React.ReactNode;
  tip: string;
  destacada?: boolean;
  onClick: () => void;
}> = ({ icono: Icono, titulo, detalle, tip, destacada, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-3 rounded-xl transition shadow-sm hover:shadow-md flex flex-col items-center gap-1.5 relative group ${
      destacada ? 'bg-rey-50 border border-rey-200' : 'bg-white'
    }`}
  >
    <Tip text={tip} />
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${destacada ? 'bg-rey-600 text-white' : 'bg-rey-50 text-rey-600'}`}>
      <Icono size={21} strokeWidth={TRAZO} />
    </div>
    <span className="text-slate-700 text-[11.5px] font-semibold leading-tight text-center">{titulo}</span>
    {detalle && <span className="text-[11px] leading-tight text-center">{detalle}</span>}
  </button>
);

/**
 * La vitrina: el catálogo y su QR, grandes y arriba.
 *
 * Era una baldosa más entre once, y el catálogo es lo que trae clientes nuevos:
 * es lo que se imprime, se pega en la vitrina y se manda por WhatsApp. Cuenta lo
 * que de verdad se sabe —productos, carpetas y si ya se publicó— y no inventa
 * lo que no se mide, como los escaneos del día.
 *
 * Sin productos no enseña cifras en cero: dice qué hacer primero.
 */
const Vitrina: React.FC<{
  productos: number;
  carpetas: number;
  /** Null mientras se pregunta, o si no se pudo saber. */
  publicado: boolean | null;
  onVerQr: () => void;
  onSubir: () => void;
  onVerCatalogo: () => void;
}> = ({ productos, carpetas, publicado, onVerQr, onSubir, onVerCatalogo }) => (
  <div className="bg-gradient-to-br from-rey-800 via-rey-700 to-rey-500 text-white rounded-3xl p-4 shadow-lg shadow-rey-700/30">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
          <Store size={22} strokeWidth={TRAZO} />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">Tu vitrina</span>
          <h3 className="text-base font-extrabold leading-tight mt-1 truncate">Catálogo y QR</h3>
        </div>
      </div>
      {productos > 0 && (
        <button
          type="button" onClick={onVerQr}
          className="bg-white text-rey-700 hover:bg-rey-50 px-3 py-1.5 rounded-xl text-[12px] font-extrabold flex items-center gap-1.5 shrink-0 shadow-sm transition"
        >
          <QrCode size={16} strokeWidth={TRAZO} /> Ver QR
        </button>
      )}
    </div>

    {productos === 0 ? (
      <>
        <p className="text-[13px] text-white/90 mt-3 leading-snug">
          Sube tu primer producto y comparte tu catálogo con un QR: quien lo escanee lo ve sin registrarse.
        </p>
        <button
          type="button" onClick={onSubir}
          className="mt-3 w-full bg-white text-slate-900 py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={17} strokeWidth={2} className="text-rey-600" /> Subir mi primer producto
        </button>
      </>
    ) : (
      <>
        <div className="grid grid-cols-3 gap-2 my-3.5 bg-rey-900/50 rounded-2xl p-2.5 border border-white/10">
          <div>
            <p className="text-[11px] text-rey-100">Productos</p>
            <p className="text-sm font-black">{productos}</p>
          </div>
          <div className="border-x border-white/15 px-2">
            <p className="text-[11px] text-rey-100">Carpetas</p>
            <p className="text-sm font-black">{carpetas}</p>
          </div>
          <div className="pl-1">
            <p className="text-[11px] text-rey-100">Estado</p>
            <p className="text-sm font-black">{publicado === null ? '—' : publicado ? 'Publicado' : 'Sin publicar'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button" onClick={onSubir}
            className="py-2.5 px-3 rounded-xl bg-white text-slate-900 font-bold text-[13px] flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus size={16} strokeWidth={2} className="text-rey-600" /> Subir producto
          </button>
          <button
            type="button" onClick={onVerCatalogo}
            className="py-2.5 px-3 rounded-xl bg-rey-900/50 text-white border border-white/25 font-bold text-[13px] flex items-center justify-center gap-1.5"
          >
            <Eye size={16} strokeWidth={TRAZO} /> Ver catálogo
          </button>
        </div>
      </>
    )}
  </div>
);

// ── Panel ────────────────────────────────────────────────────────────────

export const InicioPanel: React.FC<InicioPanelProps> = ({
  contacts, totalSinLeer, userProfile, productCount, folderCount,
  onOpenChats, onOpenChat, onCrearDocumento, onOpenFinancials, onOpenCatalog, onAddProduct, onShareQr, onOpenWallet,
  onOpenGantt, onOpenStatus, onOpenGroups, onOpenTiendas, onNewContact, onOpenContactos, onOpenAdmin, contratoSlot,
}) => {
  const familia = familiaDeNegocio(userProfile?.businessType);

  // ¿Ya se publicó? Solo se pregunta si hay productos: sin ellos no hay nada que
  // publicar y la tarjeta ni lo muestra.
  const [publicado, setPublicado] = useState<boolean | null>(null);
  useEffect(() => {
    if (productCount === 0) { setPublicado(null); return; }
    let vigente = true;
    let uid: string;
    try { uid = getCurrentUserId(); } catch { return; }
    tieneCatalogo(uid).then(si => { if (vigente) setPublicado(si); }).catch(() => { if (vigente) setPublicado(null); });
    return () => { vigente = false; };
  }, [productCount > 0]);

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
  const cotizaciones = pendientes?.cotizaciones.items ?? [];
  // La cifra grande cuenta las que siguen vigentes: es con las que el cliente aún
  // puede contestar. Las vencidas se avisan aparte. Contarlas todas inflaba la
  // urgencia: una cuenta real tenía 8 «sin respuesta» y las 8 estaban vencidas.
  const nVigentes = cotizaciones.filter(c => !c.vencida).length;
  const nVencidas = cotizaciones.length - nVigentes;
  const enCarga = cargando && !datos;

  const textoPorCobrar = enCarga || !pendientes ? '—' : nCobrar === 0 ? 'Al día' : cifraCorta(pendientes.porCobrar.total);
  const detallePorCobrar = !pendientes ? undefined : nCobrar === 0 ? 'Nada pendiente' : `${nCobrar} ${nCobrar === 1 ? 'documento' : 'documentos'}`;
  const textoCotizaciones = enCarga || !pendientes ? '—' : String(nVigentes);
  const detalleCotizaciones = !pendientes
    ? undefined
    : nVigentes === 0 && nVencidas === 0 ? 'Ninguna'
    : nVencidas === 0 ? 'sin respuesta'
    : `${nVigentes === 0 ? '' : 'sin respuesta · '}${nVencidas} ${nVencidas === 1 ? 'vencida' : 'vencidas'}`;

  // ── Mi negocio: el Gantt es de quien cotiza obra ──
  // El catálogo ya no está aquí: tiene su propia tarjeta, la Vitrina.
  const esObra = familia === 'obra';

  const cajaDetalle = (
    <span className={`font-bold ${cajaDelMes === null ? 'text-slate-400' : cajaDelMes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
      {cajaDelMes === null ? 'Caja: —' : `Caja ${cifraCorta(cajaDelMes)}`}
    </span>
  );

  const negocio = [
    {
      clave: 'finanzas',
      peso: 0,
      nodo: <Herramienta key="finanzas" icono={ChartPie} titulo="Finanzas" tip="Ingresos, cobros y gastos del negocio" detalle={cajaDetalle} onClick={onOpenFinancials} />,
    },
    {
      clave: 'contactos',
      peso: 0.5,
      nodo: (
        <Herramienta key="contactos" icono={BookUser} titulo="Contactos" tip="Todos tus clientes y proveedores, con buscador"
          detalle={<span className="text-slate-500">{contacts.length} {contacts.length === 1 ? 'contacto' : 'contactos'}</span>}
          onClick={onOpenContactos} />
      ),
    },
    {
      clave: 'gasto',
      peso: 1,
      nodo: <Herramienta key="gasto" icono={ArrowLeftRight} titulo="Registrar gasto" tip="Anota gastos según proyecto asignado" onClick={() => onCrearDocumento('expense')} />,
    },
    ...(esObra ? [{
      clave: 'gantt',
      peso: 2,
      nodo: <Herramienta key="gantt" icono={ChartGantt} titulo="Gantt" tip="Cronograma visual de tus proyectos" onClick={onOpenGantt} />,
    }] : []),
    {
      clave: 'pagos',
      peso: 4,
      nodo: <Herramienta key="pagos" icono={CreditCard} titulo="Datos de pago" tip="Tu número de cuenta y datos bancarios" onClick={onOpenWallet} />,
    },
  ].sort((a, b) => a.peso - b.peso);

  const sheetItems: Pendiente[] = hoja === 'cobrar'
    ? (pendientes?.porCobrar.items ?? [])
    // Las vigentes arriba: son las que todavía se pueden cerrar.
    : hoja === 'cotizaciones' ? [...cotizaciones].sort((a, b) => Number(a.vencida) - Number(b.vencida)) : [];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 1. HOY */}
      <section>
        <Titulo>Hoy</Titulo>
        <div className="grid grid-cols-3 gap-2.5">
          <Cifra
            icono={MessageCircle} etiqueta="Sin leer"
            valor={String(totalSinLeer)} detalle={totalSinLeer === 0 ? 'Al día' : totalSinLeer === 1 ? 'chat' : 'mensajes'}
            urgente={totalSinLeer > 0} activa={true} onClick={onOpenChats}
          />
          <Cifra
            icono={HandCoins} etiqueta="Por cobrar"
            valor={textoPorCobrar} detalle={detallePorCobrar}
            activa={nCobrar > 0} onClick={() => setHoja('cobrar')}
          />
          <Cifra
            icono={FileText} etiqueta="Cotizaciones"
            valor={textoCotizaciones} detalle={detalleCotizaciones}
            activa={cotizaciones.length > 0} onClick={() => setHoja('cotizaciones')}
          />
        </div>
      </section>

      {/* VITRINA: el catálogo y su QR, grandes y arriba. */}
      <section>
        <Vitrina
          productos={productCount} carpetas={folderCount} publicado={publicado}
          onVerQr={onShareQr} onSubir={onAddProduct} onVerCatalogo={onOpenCatalog}
        />
      </section>

      {/* 2. CHATS */}
      <section>
        <Titulo
          derecha={
            <div className="flex items-center gap-3">
              <button type="button" onClick={onNewContact} className="text-[12px] font-bold text-rey-600 flex items-center gap-1" aria-label="Agregar un contacto">
                <UserPlus size={14} strokeWidth={TRAZO} /> Contacto
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
              <CheckCircle2 size={21} strokeWidth={TRAZO} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">Estás al día con tus clientes</p>
              <p className="text-[12px] text-slate-500">No hay chats esperando respuesta.</p>
            </div>
            <ChevronRight size={16} strokeWidth={TRAZO} className="text-slate-300" />
          </button>
        ) : (
          <div className="space-y-2">
            {esperando.map(c => (
              <button
                key={c.id} type="button" onClick={() => onOpenChat(c.id)}
                className="w-full bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center gap-3 text-left hover:shadow-md hover:border-rey-300 transition"
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
                <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-bold shrink-0">Responder</span>
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
            icono={FileText} color="bg-rey-600 shadow-rey-600/30" onClick={onCrearDocumento} />
          <Documento tipo="collection_account" titulo="Cuenta de cobro" subtitulo="Cobro sin IVA" tip="Crea una cuenta de cobro según proyecto asignado"
            icono={HandCoins} color="bg-emerald-600 shadow-emerald-600/30" onClick={onCrearDocumento} />
          <Documento tipo="invoice" titulo="Factura" subtitulo="Con IVA, para empresas" tip="Documento con IVA para empresas"
            icono={Receipt} color="bg-violet-700 shadow-violet-700/30" onClick={onCrearDocumento} />
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
          <ChevronDown size={16} strokeWidth={TRAZO} className={`transition-transform ${mas ? 'rotate-180' : ''}`} />
        </button>
        {mas && (
          <div className="grid grid-cols-3 gap-2.5 mt-1">
            <Herramienta icono={Images} titulo="Historias" tip="Publica fotos de tus productos" onClick={() => onOpenStatus(false)} />
            <Herramienta icono={Camera} titulo="Cámara" tip="Toma una foto para una historia nueva" onClick={() => onOpenStatus(true)} />
            <Herramienta icono={Users} titulo="Grupos" tip="Agrupa contactos por proyecto o categoría" onClick={onOpenGroups} />
            <Herramienta icono={Heart} titulo="Siguiendo" tip="Tiendas que sigues desde sus QR" onClick={onOpenTiendas} />
            {!esObra && <Herramienta icono={ChartGantt} titulo="Gantt" tip="Cronograma visual de tus proyectos" onClick={onOpenGantt} />}
            {userProfile?.isAdmin && <Herramienta icono={ShieldCheck} titulo="Admin" tip="Panel de administración de la plataforma" onClick={onOpenAdmin} />}
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
                    : 'Las de los últimos 90 días que el cliente no ha aceptado ni rechazado. Las vigentes, primero.'}
                </p>
              </div>
              <button type="button" onClick={() => setHoja(null)} aria-label="Cerrar"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                <X size={18} strokeWidth={TRAZO} />
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
                    {p.contactoId && <p className="text-[11px] text-rey-600 font-semibold">Abrir chat</p>}
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
