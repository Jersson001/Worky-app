/**
 * ChatWindow — thin orchestrator.
 * Composes hooks and sub-components. All business logic lives in the modules.
 *
 * Original: 2393 lines → Now: ~250 lines.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { tieneCatalogo } from '../services/catalogShareService';
import { Contact, Message, ProjectStage, Product, ProductCategory, PaymentAccount, UserProfileData, Project } from '../types';
import { DocumentViewer } from './QuoteDocument';
import { formatCurrency } from '../utils/currency';
import { calculateTax } from '../utils/taxCalculations';
import { flattenSectionsToQuoteItems, computeGrandTotal, gremiosVisibles } from '../utils/carpentryCalculations';
import { useChatFormState } from '../hooks/useChatFormState';
import { useFileUpload } from '../hooks/useFileUpload';
import { uploadQuotePhotos } from '../services/storageService';
import { saveUserProfile, getCurrentUserId } from '../services/messagingService';
import { OrigenBorrador, borrarBorrador, claveBorrador, guardarBorrador, leerBorrador, listarBorradores, quoteVacia } from '../utils/borradorCotizacion';
import { hayCondiciones, repartoDePago } from '../utils/condicionesCotizacion';
import { formularioDesdeCotizacion } from '../utils/cotizacionAFormulario';
import { subtotalDeItem } from '../utils/tallas';

// Sub-components
import { normalizarContactoWhatsApp } from '../utils/contactoWhatsApp';
import { ChatHeader } from './chat/ChatHeader';
import { ChatFooter } from './chat/ChatFooter';
import { MessageList } from './chat/MessageList';
import { InfoPanel } from './chat/InfoPanel';

// Modals
import { ExpenseModal } from './chat/modals/ExpenseModal';
import { InvoiceModal } from './chat/modals/InvoiceModal';
import { QuoteModal } from './chat/modals/QuoteModal';
import { CollectionModal } from './chat/modals/CollectionModal';
import { ReceiptModal } from './chat/modals/ReceiptModal';
import { ProductPickerModal } from './chat/modals/ProductPickerModal';
import { PaymentConfirmModal } from './chat/modals/PaymentConfirmModal';
import { QRPreviewModal } from './chat/modals/QRPreviewModal';

// ─── Props (unchanged contract) ─────────────────────────────────────────────

interface ChatWindowProps {
  contact: Contact;
  allContacts: Contact[];
  messages: Message[];
  onSendMessage: (text: string, type?: 'text' | 'image' | 'file' | 'invoice' | 'product' | 'receipt' | 'quote' | 'collection_account' | 'expense_receipt', metadata?: any) => void;
  onUpdateStage: (stage: ProjectStage, projectId: string) => void;
  onAddExpense: (amount: number, description: string, targetProjectId?: string) => void;
  onUpdateProjectInfo: (value: number, name: string, projectId: string) => void;
  onAddProject: (name: string) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameContact: (contactId: string, nombre: string) => Promise<void>;
  onSetContactDocumento: (contactId: string, documento: string) => Promise<void>;
  products: Product[];
  /** Carpetas del catálogo, para buscar productos por carpeta. */
  categories: ProductCategory[];
  paymentAccounts: PaymentAccount[];
  onBack: () => void;
  activeAction?: 'invoice' | 'quote' | 'collection_account' | 'expense' | null;
  onClearAction?: () => void;
  onUpdateMessage: (messageId: string, metadata: any) => void;
  onDeleteMessage?: (messageId: string) => void;
  businessLogo?: string;
  digitalSignature?: string;
  userProfile?: UserProfileData | null;
  onOpenGantt?: (projectId?: string) => void;
  /**
   * Aviso que se pinta pegado encima del campo de escribir.
   *
   * Va en el flujo normal y no flotando: una banda fija abajo tapaba el propio
   * campo y los botones de enviar. Así empuja el compositor hacia arriba y todo
   * sigue alcanzable.
   */
  avisoSobreElInput?: React.ReactNode;
  /** Quien mira es un cliente, no alguien que vende con Worky. Ver App.tsx. */
  esCliente?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ChatWindow: React.FC<ChatWindowProps> = (props) => {
  if (!props.contact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 mb-3">
          <i className="fa-solid fa-comments text-2xl"></i>
        </div>
        <p className="text-sm font-medium text-slate-500">Cargando contacto...</p>
      </div>
    );
  }
  return <ChatWindowContent {...props} contact={props.contact} />;
};

const ChatWindowContent: React.FC<ChatWindowProps & { contact: Contact }> = ({
  contact, allContacts, messages, onSendMessage, onUpdateStage, onAddExpense,
  onUpdateProjectInfo, onAddProject, onDeleteProject, onRenameContact, onSetContactDocumento, products, categories, paymentAccounts, onBack, activeAction, onClearAction,
  onUpdateMessage, businessLogo, digitalSignature, userProfile, onOpenGantt, onDeleteMessage,
  avisoSobreElInput,
  esCliente = false,
}) => {
  // ── UI Toggles ──
  const [showInfo, setShowInfo] = useState(false);

  // Si este contacto tiene catálogo publicado, la cabecera ofrece volver a él.
  // Se mira una vez por contacto; un contacto manual no tiene y ni se pregunta.
  const [conCatalogo, setConCatalogo] = useState(false);
  useEffect(() => {
    let vigente = true;
    setConCatalogo(false);
    void tieneCatalogo(contact.id).then(si => { if (vigente) setConCatalogo(si); });
    return () => { vigente = false; };
  }, [contact.id]);

  // Ruta relativa y no la URL publicada: en el APK la app corre en el propio
  // teléfono, y una dirección externa la abriría en el navegador, fuera de
  // Worky. Desde el catálogo, «Chatear con…» lo devuelve a esta conversación.
  const verSuCatalogo = useCallback(() => {
    window.location.href = `/?catalogo=${encodeURIComponent(contact.id)}`;
  }, [contact.id]);
  const [showFinancials, setShowFinancials] = useState(false);
  const [showSystemMessages, setShowSystemMessages] = useState(false);

  // ── Document viewer ──
  const [viewingDocument, setViewingDocument] = useState<{ type: 'quote' | 'invoice' | 'receipt' | 'collection_account', data: any } | null>(null);
  /** Subiendo las fotos de la cotización antes de mandarla. */
  const [enviandoCotizacion, setEnviandoCotizacion] = useState(false);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [plantillaGuardada, setPlantillaGuardada] = useState(false);


  // ── Hooks ──
  const forms = useChatFormState(
    contact.clientName,
    // El contacto del cliente, sea número o usuario de WhatsApp: el documento
    // lo rotula según cuál sea.
    contact.phone || '',
    contact.projects[0]?.id || '',
    // Las condiciones del negocio y su anticipo de costumbre, para que cada
    // cotización nueva salga ya con ellos puestos.
    {
      condiciones: userProfile?.condicionesCotizacion,
      anticipoPorcentaje: userProfile?.anticipoPorcentaje,
      gremios: gremiosVisibles(userProfile?.businessType),
    },
  );

  /**
   * Deja las condiciones de esta cotización como las de siempre.
   *
   * Van al perfil, que es donde las lee cada cotización nueva. Sin esto habría
   * que reescribir el pliego de garantías y suministros en cada una, que es
   * trabajo que nadie hace dos veces.
   */
  const guardarCondicionesComoPlantilla = useCallback(async () => {
    if (!userProfile) return;
    setGuardandoPlantilla(true);
    try {
      await saveUserProfile({
        ...userProfile,
        condicionesCotizacion: forms.quote.condiciones,
        anticipoPorcentaje: Number(forms.quote.anticipoPorcentaje) || 0,
      });
      setPlantillaGuardada(true);
      // El acuse se apaga solo: si se queda fijo, la próxima vez que abra el
      // formulario parece que ya guardó algo que no ha tocado.
      setTimeout(() => setPlantillaGuardada(false), 4000);
    } catch (error) {
      console.error('Error guardando las condiciones:', error);
      alert('No se pudieron guardar las condiciones. Revisa la conexión.');
    } finally {
      setGuardandoPlantilla(false);
    }
  }, [userProfile, forms.quote.condiciones, forms.quote.anticipoPorcentaje]);

  const fileUpload = useFileUpload({
    contactId: contact.id,
    onSendMessage,
  });

  // ── Derived data ──
  // Por id y no por nombre, igual que en InfoPanel: dos cocinas cotizadas al
  // mismo cliente son dos proyectos, y contándolos por nombre salía uno.
  const approvedProjects = useMemo(() => {
    const todos = (contact.projects || []).filter(p => p && p.name);
    return todos.filter((project, index, self) => index === self.findIndex(pp => pp.id === project.id));
  }, [contact.projects]);

  const approvedProjectsCount = approvedProjects.length;
  const displayProjectName = approvedProjectsCount === 0
    ? 'Sin proyectos'
    : approvedProjectsCount === 1
      ? '1 proyecto'
      : `${approvedProjectsCount} proyectos`;
  const hasMultipleProjects = approvedProjectsCount > 1;

  const totalGlobalValue = contact.projects.reduce((sum, p) => sum + p.value, 0);
  const totalGlobalExpenses = contact.projects.reduce((sum, p) => sum + p.expenses.reduce((s, e) => s + e.amount, 0), 0);
  const globalProfit = totalGlobalValue - totalGlobalExpenses;

  // ── Sync contact changes ──
  useEffect(() => {
    forms.setCollectionField('directedTo', contact.clientName);
    forms.setCollectionField('nit', contact.documento || '');
    if (contact.projects.length > 0) {
      forms.setExpenseField('targetProjectId', contact.projects[0].id);
    }
    if (contact.phone) {
      forms.setQuoteField('clientPhone', (contact.phone || ''));
    }
    forms.setQuoteField('clientDocumento', contact.documento || '');
  }, [contact]);

  // ── Handle active action from parent ──
  useEffect(() => {
    if (activeAction) {
      const actionMap: Record<string, keyof typeof forms.modals> = {
        invoice: 'invoice',
        quote: 'quote',
        collection_account: 'collection',
        expense: 'expense',
      };
      const modal = actionMap[activeAction];
      if (modal) {
        if (activeAction === 'quote') {
          forms.setQuoteField('clientPhone', contact.phone || '');
          forms.setQuoteField('clientDocumento', contact.documento || '');
        }
  forms.openModal(modal);
      }
      onClearAction?.();
    }
  }, [activeAction, onClearAction, contact.phone]);

  // ── Handlers ──
  const handleSaveExpense = useCallback(() => {
    const { amount, description, targetProjectId } = forms.expense;
    if (!amount || !description) return;

    if ((contact.role === 'supplier' || contact.projects.length > 1) && !targetProjectId) {
      alert('Por favor selecciona a qué proyecto pertenece este gasto.');
      return;
    }

    onAddExpense(Number(amount), description, targetProjectId || undefined);

    const selectedProject = contact.projects.find(p => p.id === targetProjectId) || contact.projects[0];
    onSendMessage('', 'expense_receipt', {
      id: Date.now().toString(),
      number: `RG-${Math.floor(Math.random() * 10000)}`,
      amount: Number(amount),
      concept: description,
      projectId: targetProjectId || contact.projects[0]?.id,
      projectName: selectedProject?.name || '',
      date: new Date(),
      paymentMethod: 'Gasto Registrado',
    });

    forms.resetExpense();
    forms.closeModal('expense');
  }, [forms.expense, contact, onAddExpense, onSendMessage]);

  const handleSendInvoice = useCallback(() => {
    const validItems = forms.invoice.items.filter(i => i.description && i.price > 0);
    if (validItems.length === 0) return;

    const subtotal = validItems.reduce((acc, item) => acc + subtotalDeItem(item), 0);
    const result = calculateTax(subtotal, forms.invoice.taxType);
    const selectedProject = contact.projects.find(p => p.id === forms.invoice.selectedProject);

    const taxDetails: any = { type: forms.invoice.taxType };
    if (forms.invoice.taxType === 'iva') {
      taxDetails.iva = result.taxAmount;
      taxDetails.ivaPercentage = 19;
    } else if (forms.invoice.taxType === 'aiu' && result.breakdown) {
      taxDetails.administracion = result.breakdown.administracion;
      taxDetails.imprevistos = result.breakdown.imprevistos;
      taxDetails.utilidad = result.breakdown.utilidad;
      taxDetails.ivaUtilidad = result.breakdown.ivaUtilidad;
    }

    onSendMessage('📄 Factura generada', 'invoice', {
      id: Date.now().toString(),
      number: `FAC-${Math.floor(Math.random() * 10000)}`,
      clientName: contact.clientName,
      clientDocumento: contact.documento?.trim() || undefined,
      items: validItems, subtotal, taxDetails,
      total: result.total,
      projectName: selectedProject?.name || '',
      date: new Date(), status: 'Pending',
    });

    forms.resetInvoice();
    forms.closeModal('invoice');
  }, [forms.invoice, contact, onSendMessage]);

  // ── Borrador de la cotización ──
  // Se guarda en el teléfono mientras se escribe, uno por contacto, y se retoma
  // al volver a abrir la cotización. Ver utils/borradorCotizacion.ts.
  const usuarioId = useMemo(() => {
    try { return getCurrentUserId(); } catch { return null; }
  }, [contact.id]);
  /** El borrador de la cotización que se hace de cero. */
  const claveDelBorrador = useMemo(
    () => (usuarioId ? claveBorrador(usuarioId, contact.id) : null),
    [usuarioId, contact.id],
  );
  /** Todos los borradores de este contacto: el de cero y los de cada copia o edición. */
  const [borradores, setBorradores] = useState(() => (usuarioId ? listarBorradores(usuarioId, contact.id) : []));
  const refrescarBorradores = useCallback(() => {
    setBorradores(usuarioId ? listarBorradores(usuarioId, contact.id) : []);
  }, [usuarioId, contact.id]);
  /** El formulario abierto trae lo que quedó a medias, y se le avisa. */
  const [borradorRetomado, setBorradorRetomado] = useState(false);
  /** Cuántas fotos recién tomadas no entraron en el borrador que se retomó. */
  const [fotosPerdidas, setFotosPerdidas] = useState(0);
  const quoteRef = useRef(forms.quote);
  quoteRef.current = forms.quote;
  const yaRestauradoAlAbrir = useRef(false);

  /**
   * De qué cotización ya enviada viene el formulario abierto, si viene de una.
   *
   * «copia» arma una cotización nueva a partir de otra; «edicion» corrige la
   * misma y, al guardar, la reescribe en el chat. Cada una tiene su propio
   * borrador, aparte del de la cotización de cero: empezar una copia no debe
   * pisar lo que se llevaba escrito en otra.
   */
  const [origenCotizacion, setOrigenCotizacion] = useState<OrigenBorrador | null>(null);
  const origenRef = useRef(origenCotizacion);
  origenRef.current = origenCotizacion;
  /** Dónde se guarda lo que se escribe ahora mismo. */
  const claveActiva = origenCotizacion && usuarioId
    ? claveBorrador(usuarioId, contact.id, origenCotizacion)
    : claveDelBorrador;

  /**
   * Cómo quedó el formulario al abrir una copia o una edición.
   *
   * Abrir una copia y cerrarla sin tocar nada no es trabajo a medias: si se
   * guardara, aparecería un «borrador» de algo que no se escribió. Se compara
   * con esto para saber si hubo cambios. Nulo = no se sabe, y se guarda.
   */
  const baseDelOrigen = useRef<string | null>(null);
  const basePendiente = useRef(false);
  useEffect(() => {
    if (!basePendiente.current || !origenRef.current) return;
    baseDelOrigen.current = JSON.stringify(forms.quote);
    basePendiente.current = false;
  }, [forms.quote]);
  const sinCambiosDelOrigen = () =>
    !!origenRef.current && baseDelOrigen.current !== null && JSON.stringify(quoteRef.current) === baseDelOrigen.current;

  useEffect(() => {
    refrescarBorradores();
    setBorradorRetomado(false);
  }, [refrescarBorradores]);

  // Se guarda con un respiro de medio segundo, para no escribir en cada tecla.
  useEffect(() => {
    if (!claveActiva || !forms.modals.quote) return;
    const t = setTimeout(() => {
      if (sinCambiosDelOrigen()) return;
      guardarBorrador(claveActiva, forms.quote, origenCotizacion ?? undefined);
      refrescarBorradores();
    }, 500);
    return () => clearTimeout(t);
  }, [forms.quote, forms.modals.quote, claveActiva, origenCotizacion]);

  // Cerrar la app no avisa: al pasar a segundo plano se guarda lo último, sin
  // esperar al respiro.
  useEffect(() => {
    if (!claveActiva || !forms.modals.quote) return;
    const volcar = () => {
      if (sinCambiosDelOrigen()) return;
      guardarBorrador(claveActiva, quoteRef.current, origenRef.current ?? undefined);
    };
    const alOcultar = () => { if (document.visibilityState === 'hidden') volcar(); };
    document.addEventListener('visibilitychange', alOcultar);
    window.addEventListener('pagehide', volcar);
    return () => {
      document.removeEventListener('visibilitychange', alOcultar);
      window.removeEventListener('pagehide', volcar);
    };
  }, [claveActiva, forms.modals.quote]);

  // Al abrir la cotización con el formulario en blanco, vuelve lo que había.
  // Si llega con contenido —desde una foto del chat— no se pisa. Las copias y
  // las ediciones traen lo suyo y no pasan por aquí.
  useEffect(() => {
    if (!forms.modals.quote) { yaRestauradoAlAbrir.current = false; return; }
    if (yaRestauradoAlAbrir.current) return;
    yaRestauradoAlAbrir.current = true;
    if (!claveDelBorrador || origenRef.current) return;
    const guardado = leerBorrador(claveDelBorrador);
    if (guardado && quoteVacia(quoteRef.current)) {
      forms.restoreQuote(guardado.quote);
      setFotosPerdidas(guardado.fotosOmitidas);
      setBorradorRetomado(true);
    }
  }, [forms.modals.quote, claveDelBorrador]);

  /** Borra un borrador sin tocar el formulario. */
  const descartarBorrador = (clave: string) => {
    borrarBorrador(clave);
    refrescarBorradores();
  };

  /** Deja el formulario de cero en blanco, sin el borrador que traía. */
  const empezarDeCero = () => {
    if (claveDelBorrador) borrarBorrador(claveDelBorrador);
    refrescarBorradores();
    setBorradorRetomado(false);
    forms.resetQuote((contact.phone || ''), contact.documento || '');
  };

  const cerrarCotizacion = () => {
    if (claveActiva && !sinCambiosDelOrigen()) {
      guardarBorrador(claveActiva, forms.quote, origenCotizacion ?? undefined);
      refrescarBorradores();
    }
    setBorradorRetomado(false);
    setOrigenCotizacion(null);
    baseDelOrigen.current = null;
    basePendiente.current = false;
    forms.resetQuote((contact.phone || ''), contact.documento || '');
    forms.closeModal('quote');
  };

  /**
   * Abre el formulario con una cotización ya enviada puesta encima.
   *
   * Si esa cotización ya tenía un borrador a medias, se retoma en vez de
   * empezar otra vez: es lo que se perdía al recargar la página. `desdeCero`
   * lo ignora y vuelve a copiar la original.
   *
   * Reemplaza lo que hubiera en el formulario: quien llega aquí viene de pulsar
   * el botón de una cotización, no de seguir escribiendo.
   */
  const abrirDesdeCotizacion = useCallback((msg: Message, tipo: 'copia' | 'edicion', desdeCero = false) => {
    if (!msg.metadata) return;
    const origen: OrigenBorrador = {
      tipo,
      messageId: msg.id,
      numero: msg.metadata.number || '',
      metadataId: msg.metadata.id,
    };
    const clave = usuarioId ? claveBorrador(usuarioId, contact.id, origen) : null;
    if (clave && desdeCero) { borrarBorrador(clave); refrescarBorradores(); }
    const previo = clave && !desdeCero ? leerBorrador(clave) : null;

    forms.resetQuote((contact.phone || ''), contact.documento || '');
    if (previo) {
      forms.restoreQuote(previo.quote);
      setFotosPerdidas(previo.fotosOmitidas);
      baseDelOrigen.current = null;
      basePendiente.current = false;
    } else {
      forms.restoreQuote(formularioDesdeCotizacion(msg.metadata, paymentAccounts));
      baseDelOrigen.current = null;
      basePendiente.current = true;
    }
    setBorradorRetomado(!!previo);
    setOrigenCotizacion(origen);
    forms.openModal('quote');
  }, [forms, contact.id, contact.phone, contact.documento, paymentAccounts, usuarioId, refrescarBorradores]);

  /**
   * La cotización tal como saldría, con las líneas y secciones que se le pasen.
   *
   * La usan el envío —con las fotos ya subidas— y la vista previa —con las que
   * están en el teléfono—: así lo que se ve antes de crearla es lo que llega.
   */
  const armarCotizacion = useCallback((validItems: any[], sectionsFinales: any[], numero: string) => {
    const { taxType, taxPercentage, aiuAdmin, aiuImprevistos, aiuUtilidad, aiuIva, clientAddress, clientPhone, clientDocumento, validDays, mode, sections, anticipoPorcentaje, cuentaCobroId, condiciones } = forms.quote;
    const isPersonalizada = mode === 'personalizada';
    const subtotal = isPersonalizada ? computeGrandTotal(sections) : validItems.reduce((acc, item) => acc + subtotalDeItem(item), 0);
    const result = calculateTax(subtotal, taxType, {
      percentage: parseFloat(taxPercentage) || 19,
      aiu: { adminPercent: parseFloat(aiuAdmin) || 5, imprevistosPercent: parseFloat(aiuImprevistos) || 5, utilidadPercent: parseFloat(aiuUtilidad) || 5, ivaPercent: parseFloat(aiuIva) || 19 },
    });

    const cuentaSeleccionada = paymentAccounts.find(c => c.id === cuentaCobroId);

    const validDate = new Date();
    validDate.setDate(validDate.getDate() + parseInt(validDays || '15'));

    return {
      id: Date.now().toString(),
      number: numero,
      clientName: contact.clientName,
      clientAddress: clientAddress.trim() || undefined,
      clientPhone: normalizarContactoWhatsApp(clientPhone) || undefined,
      clientDocumento: clientDocumento.trim() || undefined,
      items: validItems, subtotal, total: result.total,
      mode, sections: isPersonalizada ? sectionsFinales : undefined,
      // La cuenta se copia entera, no por referencia: si mañana se borra de la
      // libreta, la cotización que ya se mandó tiene que seguir diciendo a
      // dónde consignar. Mismo criterio que el QR de los recibos.
      formaPago: {
        anticipoPorcentaje: Number(anticipoPorcentaje) || 0,
        ...(cuentaSeleccionada ? {
          cuenta: {
            bankName: cuentaSeleccionada.bankName,
            accountType: cuentaSeleccionada.accountType,
            accountNumber: cuentaSeleccionada.accountNumber,
            holderName: cuentaSeleccionada.holderName,
            documentId: cuentaSeleccionada.documentId,
            qrImage: cuentaSeleccionada.qrImage,
          },
        } : {}),
      },
      // Solo si hay algo que decir: un pie de condiciones vacío es una raya y
      // un título en medio del documento.
      ...(hayCondiciones(condiciones) ? { condiciones } : {}),
      taxType, taxPercentage: taxType === 'percentage' ? parseFloat(taxPercentage) : undefined,
      taxAmount: (taxType !== 'none') ? result.taxAmount : undefined,
      aiuAdmin: taxType === 'aiu' ? parseFloat(aiuAdmin) : undefined,
      aiuImprevistos: taxType === 'aiu' ? parseFloat(aiuImprevistos) : undefined,
      aiuUtilidad: taxType === 'aiu' ? parseFloat(aiuUtilidad) : undefined,
      aiuIva: taxType === 'aiu' ? parseFloat(aiuIva) : undefined,
      date: new Date(), validUntil: validDate, status: 'pending',
    };
  }, [forms.quote, contact, paymentAccounts]);

  /**
   * El mensaje de la cotización que se está viendo, si es una que envió el
   * usuario. El visor solo recibe el documento; para copiarlo o editarlo hace
   * falta el mensaje, que es lo que se reescribe en el chat.
   */
  const mensajeDeCotizacionVista = useMemo(() => {
    if (viewingDocument?.type !== 'quote') return null;
    const meta = viewingDocument.data;
    return messages.find(m =>
      m.type === 'quote' && m.sender === 'me' && m.metadata
      && (meta?.id ? m.metadata.id === meta.id : m.metadata.number === meta?.number),
    ) ?? null;
  }, [viewingDocument, messages]);

  /** La cotización en pantalla, antes de crearla. Null = cerrada. */
  const [vistaPrevia, setVistaPrevia] = useState<any | null>(null);

  const abrirVistaPrevia = () => {
    const { items, mode, sections } = forms.quote;
    const lineas = mode === 'personalizada' ? flattenSectionsToQuoteItems(sections) : items.filter(i => i.description && i.price > 0);
    if (lineas.length === 0) {
      alert('Todavía no hay ninguna línea con precio para mostrar. Agrega al menos un ítem con cantidad y costo unitario.');
      return;
    }
    setVistaPrevia(armarCotizacion(lineas, sections, origenCotizacion?.tipo === 'edicion' ? origenCotizacion.numero : 'VISTA PREVIA'));
  };

  const handleSendQuote = useCallback(async () => {
    if (enviandoCotizacion) return;
    const { items, clientDocumento, mode, sections } = forms.quote;

    const isPersonalizada = mode === 'personalizada';
    const validItemsSinSubir = isPersonalizada ? flattenSectionsToQuoteItems(sections) : items.filter(i => i.description && i.price > 0);
    // El botón se habilita con el total en pantalla, así que llegar aquí sin
    // líneas significa que ambos criterios se separaron otra vez. Se avisa: un
    // return mudo deja al usuario dándole al botón sin saber qué le falta.
    if (validItemsSinSubir.length === 0) {
      alert('La cotización no tiene ninguna línea con precio, así que no se envió. Revisa que los ítems tengan cantidad y costo unitario.');
      return;
    }

    // Las fotos van a Storage y en la cotización queda su dirección. Antes
    // viajaban en base64 dentro del mensaje: cada cotización con fotos pesaba
    // megas, y eso se carga entero cada vez que se abre el chat.
    let validItems = validItemsSinSubir;
    let sectionsSubidas = sections;

    setEnviandoCotizacion(true);
    try {
      validItems = await Promise.all(
        validItemsSinSubir.map(async item => ({ ...item, images: await uploadQuotePhotos(item.images) })),
      );

      if (isPersonalizada) {
        sectionsSubidas = await Promise.all(
          sections.map(async section => ({
            ...section,
            groups: await Promise.all(
              section.groups.map(async group => ({
                ...group,
                items: await Promise.all(
                  group.items.map(async item => ({ ...item, images: await uploadQuotePhotos(item.images) })),
                ),
              })),
            ),
          })),
        );
      }
    } catch (error) {
      // No se manda a medias: sin las fotos, el cliente recibe una cotización
      // distinta de la que se preparó.
      console.error('Error subiendo las fotos de la cotización:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`Error al enviar la cotización: ${errorMsg}\n\nRevisa la conexión y vuelve a intentarlo.`);
      return;
    } finally {
      setEnviandoCotizacion(false);
    }

    const origen = origenCotizacion;
    if (origen?.tipo === 'edicion') {
      // La misma cotización, con el mismo número: el cliente ve cambiar la que
      // ya tenía en el chat, no le llega otra. Vuelve a pendiente porque lo que
      // aprobara o rechazara ya no es lo que dice el documento.
      const corregida = {
        ...armarCotizacion(validItems, sectionsSubidas, origen.numero),
        ...(origen.metadataId ? { id: origen.metadataId } : {}),
        editadaEl: new Date(),
      };
      onUpdateMessage(origen.messageId, { metadata: corregida });
    } else {
      onSendMessage('📋 Cotización enviada', 'quote', armarCotizacion(validItems, sectionsSubidas, `COT-${Math.floor(Math.random() * 10000)}`));
    }

    // Lo que se escribió aquí queda en la ficha: la próxima cotización a este
    // cliente ya sale con su documento. Si falla no se pierde la cotización.
    const documentoFinal = clientDocumento.trim();
    if (documentoFinal && documentoFinal !== (contact.documento || '')) {
      onSetContactDocumento(contact.id, documentoFinal).catch(e =>
        console.warn('No se pudo guardar el documento en el contacto:', e));
    }

    // Enviada, ya no es borrador. Cada trabajo borra solo el suyo: enviar una
    // copia no cierra el de la cotización de cero ni el de otra copia.
    if (claveActiva) borrarBorrador(claveActiva);
    refrescarBorradores();
    setBorradorRetomado(false);
    setOrigenCotizacion(null);
    baseDelOrigen.current = null;
    basePendiente.current = false;
    forms.resetQuote((contact.phone || ''), documentoFinal || contact.documento || '');
    forms.closeModal('quote');
  }, [forms.quote, contact, onSendMessage, onUpdateMessage, enviandoCotizacion, armarCotizacion, onSetContactDocumento, claveActiva, origenCotizacion, refrescarBorradores]);

  const handleSendCollection = useCallback(() => {
    const { amount, concept, directedTo, nit, selectedAccount, selectedProject } = forms.collection;
    if (!amount || !concept) return;

    const selectedAcc = selectedAccount === 'efectivo' ? null : paymentAccounts.find(acc => acc.id === selectedAccount);
    const project = contact.projects.find(p => p.id === selectedProject);

    onSendMessage('📨 Cuenta de Cobro enviada', 'collection_account', {
      id: Date.now().toString(),
      number: `CC-${Math.floor(Math.random() * 10000)}`,
      amount: Number(amount), concept, directedTo, nit,
      bankName: selectedAccount === 'efectivo' ? 'Pago en Efectivo' : (selectedAcc?.bankName || ''),
      accountType: selectedAccount === 'efectivo' ? '' : (selectedAcc?.accountType || ''),
      accountNumber: selectedAccount === 'efectivo' ? '' : (selectedAcc?.accountNumber || ''),
      holderName: selectedAccount === 'efectivo' ? '' : (selectedAcc?.holderName || ''),
      // El QR se copia dentro del mensaje a propósito: si el vendedor cambia
      // de cuenta después, la cuenta de cobro ya enviada debe seguir mostrando
      // el QR con el que se pidió la plata.
      qrImage: selectedAccount === 'efectivo' ? undefined : selectedAcc?.qrImage,
      projectName: project?.name || '', date: new Date(),
    });

    forms.resetCollection(contact.clientName, contact.documento);
    forms.closeModal('collection');
  }, [forms.collection, contact, paymentAccounts, onSendMessage]);

  const handleSendReceipt = useCallback(() => {
    const { amount, concept, selectedAccount, selectedProject } = forms.receipt;
    if (!amount || !concept) return;

    // El avance se abona a una obra concreta. Con un solo proyecto se da por
    // hecho: preguntarlo cuando no hay elección es una casilla de más.
    const proyectoDelAvance = contact.projects.find(p => p.id === selectedProject)
      || (contact.projects.length === 1 ? contact.projects[0] : undefined);

    const selectedAcc = selectedAccount === 'efectivo' ? null : paymentAccounts.find(acc => acc.id === selectedAccount);

    const receiptMetadata: any = {
      id: Date.now().toString(),
      number: `RC-${Math.floor(Math.random() * 10000)}`,
      amount: Number(amount), concept, date: new Date(),
      paymentMethod: selectedAccount === 'efectivo' ? 'Efectivo' : 'Transferencia',
      bankName: selectedAccount === 'efectivo' ? 'Pago en Efectivo' : (selectedAcc?.bankName || ''),
      accountType: selectedAccount === 'efectivo' ? '' : (selectedAcc?.accountType || ''),
      accountNumber: selectedAccount === 'efectivo' ? '' : (selectedAcc?.accountNumber || ''),
      holderName: selectedAccount === 'efectivo' ? '' : (selectedAcc?.holderName || ''),
      // El mismo QR que cargó el vendedor en sus datos de pago. Se copia al
      // enviar para que el recibo no cambie si luego borra esa cuenta.
      qrImage: selectedAccount === 'efectivo' ? undefined : selectedAcc?.qrImage,
      selectedAccountId: selectedAccount,
      projectId: proyectoDelAvance?.id,
      projectName: proyectoDelAvance?.name || '',
    };

    if (contact.role === 'supplier') {
      receiptMetadata.clientName = contact.clientName;
      receiptMetadata.fromSupplier = true;
    } else {
      receiptMetadata.clientName = contact.clientName;
      receiptMetadata.clientDocumento = contact.documento?.trim() || undefined;
    }

    onSendMessage(
      contact.role === 'supplier' ? '💰 Recibo de pago recibido' : '💰 Recibo de pago generado',
      'receipt', receiptMetadata
    );

    forms.resetReceipt();
    forms.closeModal('receipt');
  }, [forms.receipt, contact, paymentAccounts, onSendMessage]);

  const handleConfirmPayment = useCallback(() => {
    if (!forms.pendingPayment) return;
    const message = messages.find(m => m.id === forms.pendingPayment!.id);
    if (message) {
      onUpdateMessage(forms.pendingPayment.id, { ...message, isPaid: true, paidDate: new Date() });
    }
    forms.setPendingPayment(null);
    forms.closeModal('paymentConfirm');
  }, [forms.pendingPayment, messages, onUpdateMessage]);

  const handleCopyPaymentInfo = useCallback((metadata: any) => {
    let textToCopy = '';
    if (metadata.accountNumber) {
      textToCopy = `Banco: ${metadata.bankName || ''}\nTipo: ${metadata.accountType || ''}\nNúmero de cuenta: ${metadata.accountNumber}\nTitular: ${metadata.holderName || ''}\nMonto: ${formatCurrency(metadata.amount || metadata.total || 0)}`;
    } else {
      textToCopy = `Monto: ${formatCurrency(metadata.amount || metadata.total || 0)}`;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      forms.setCopiedText(metadata.number || 'info');
      setTimeout(() => forms.setCopiedText(null), 2000);
    }).catch(err => console.error('Error al copiar:', err));
  }, []);

  const handleMarkPayment = useCallback((msg: Message) => {
    forms.setPendingPayment({ id: msg.id, type: msg.type, metadata: msg.metadata });
    forms.openModal('paymentConfirm');
  }, []);

  /**
   * «Cotizar» sobre una foto del chat: abre la cotización con esa foto ya
   * puesta como ítem. Le ahorra al vendedor bajar la imagen, buscar el chat de
   * nuevo y volver a subirla, que es lo que hacía hasta ahora.
   */
  const handleQuoteImage = useCallback((imageUrl: string, texto?: string) => {
    forms.setQuoteField('clientPhone', (contact.phone || ''));
    forms.setQuoteField('clientDocumento', contact.documento || '');
    forms.addPhotoToQuote(imageUrl, texto);
    forms.openModal('quote');
  }, [forms, contact.phone, contact.documento]);

  const handleShowQR = useCallback((qrUrl: string, metadata: any) => {
    forms.setQrPreviewData({ qrUrl, metadata });
    forms.openModal('qrPreview');
  }, []);

  const handleCameraCapture = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          onSendMessage(event.target?.result as string, 'text');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, [onSendMessage]);

  const handleSendTextMessage = useCallback((text: string) => {
    onSendMessage(text);
  }, [onSendMessage]);

  const handleSelectProduct = useCallback((product: Product) => {
    // El nombre va como texto del mensaje, aunque la burbuja no lo pinte —tiene
    // el suyo, más grande—: es lo que se guarda como «último mensaje» y lo que
    // se lee en la lista de chats. Con el texto vacío, mandar un producto
    // dejaba la conversación en blanco en la lista.
    onSendMessage(product.name || 'Producto', 'product', product);
    forms.closeModal('productPicker');
  }, [onSendMessage]);

  // ── Render ──
  return (
    <div className="flex-1 flex h-full relative">
      {/* Document Viewer */}
      {vistaPrevia && (
        <DocumentViewer
          type="quote"
          data={vistaPrevia}
          onClose={() => setVistaPrevia(null)}
          businessLogo={businessLogo}
          digitalSignature={digitalSignature}
          contactPhone={contact.phone}
          contactId={contact.id}
          userProfile={userProfile}
          soloLectura
          acciones={
            <button
              type="button"
              onClick={() => { setVistaPrevia(null); void handleSendQuote(); }}
              className="bg-[#00a884] text-[#111b21] px-6 py-2 rounded-full font-bold shadow-lg hover:bg-[#00c298] transition flex items-center gap-2"
            >
              <i className="fa-solid fa-paper-plane"></i> {origenCotizacion?.tipo === 'edicion' ? 'Guardar cambios' : contact.role === 'supplier' ? 'Enviar cotización' : 'Crear cotización'}
            </button>
          }
        />
      )}

      {viewingDocument && (
        <DocumentViewer
          type={viewingDocument.type}
          data={viewingDocument.data}
          onClose={() => setViewingDocument(null)}
          businessLogo={businessLogo}
          digitalSignature={digitalSignature}
          contactPhone={contact.phone}
          contactId={contact.id}
          userProfile={userProfile}
          acciones={mensajeDeCotizacionVista && !esCliente ? (
            <>
              {/* Aprobada ya tiene proyecto: cambiarle el precio dejaría el
                  proyecto con otro valor que el documento. Para eso está copiar,
                  que arma una cotización nueva. */}
              {mensajeDeCotizacionVista.metadata?.status !== 'accepted' && (
                <button
                  type="button"
                  onClick={() => { setViewingDocument(null); abrirDesdeCotizacion(mensajeDeCotizacionVista, 'edicion'); }}
                  className="bg-amber-500 text-[#111b21] px-6 py-2 rounded-full font-bold shadow-lg hover:bg-amber-400 transition flex items-center gap-2"
                >
                  <i className="fa-solid fa-pen"></i> Editar
                </button>
              )}
              <button
                type="button"
                onClick={() => { setViewingDocument(null); abrirDesdeCotizacion(mensajeDeCotizacionVista, 'copia'); }}
                className="bg-[#37404a] text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-[#46515c] transition flex items-center gap-2"
              >
                <i className="fa-regular fa-copy"></i> Copiar
              </button>
            </>
          ) : undefined}
        />
      )}

      {/* Main Chat Column */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-slate-50">
        <ChatHeader
          contact={contact}
          approvedProjectsCount={approvedProjectsCount}
          displayProjectName={displayProjectName}
          hasMultipleProjects={hasMultipleProjects}
          onBack={onBack}
          onToggleInfo={() => setShowInfo(!showInfo)}
          showInfo={showInfo}
          onOpenGantt={onOpenGantt}
          onOpenProductPicker={() => forms.openModal('productPicker')}
          onVerCatalogo={conCatalogo ? verSuCatalogo : undefined}
        />

        {/* Financial Bar */}
        {showFinancials && contact.role === 'client' && (
          <div className="bg-white border-b border-slate-100 shadow-sm px-4 py-3 flex justify-between items-center text-xs z-10 animate-slide-in-top">
            <div className="flex gap-6 flex-1">
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Venta Total</span>
                <span className="text-slate-900 font-bold text-sm">{formatCurrency(totalGlobalValue)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Total Gastos</span>
                <span className="text-rose-600 font-bold text-sm">{formatCurrency(totalGlobalExpenses)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Ganancia</span>
                <span className={`font-black text-sm ${globalProfit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(globalProfit)}</span>
              </div>
            </div>
            <button onClick={() => forms.openModal('expense')} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition font-bold">
              <i className="fa-solid fa-circle-minus"></i> Registrar Gasto
            </button>
          </div>
        )}

        <MessageList
          messages={messages}
          showSystemMessages={showSystemMessages}
          contactRole={contact.role}
          contactName={contact.clientName}
          copiedText={forms.copiedText}
          onViewDocument={(type, data) => setViewingDocument({ type, data })}
          onMarkPayment={handleMarkPayment}
          onUpdateMessage={onUpdateMessage}
          onDeleteMessage={onDeleteMessage}
          onCopyPaymentInfo={handleCopyPaymentInfo}
          onShowQR={handleShowQR}
          onQuoteImage={esCliente ? undefined : handleQuoteImage}
        />

        {avisoSobreElInput}

        {!forms.modals.quote && !esCliente && borradores.map(({ clave, borrador }) => {
          const origen = borrador.origen;
          // El borrador de una copia o edición va con su cotización: si ya no
          // está en el chat, o se aprobó mientras tanto —ya no se puede editar—,
          // no hay a qué volver y no se ofrece.
          const mensajeOrigen = origen ? messages.find(m => m.id === origen.messageId) : undefined;
          if (origen && (!mensajeOrigen || (origen.tipo === 'edicion' && mensajeOrigen.metadata?.status === 'accepted'))) return null;
          const titulo = !origen
            ? 'Borrador de cotización'
            : origen.tipo === 'edicion' ? `Borrador de edición · ${origen.numero}` : `Borrador de copia · ${origen.numero}`;
          return (
            <div key={clave} className="mx-3 mb-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-900">
              <i className="fa-solid fa-file-pen text-amber-600"></i>
              <span className="flex-1 min-w-0 truncate">
                <b>{titulo}</b>
                {' · '}
                {new Date(borrador.guardado).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                type="button"
                onClick={() => (origen && mensajeOrigen ? abrirDesdeCotizacion(mensajeOrigen, origen.tipo) : forms.openModal('quote'))}
                className="font-bold text-blue-700 hover:underline"
              >
                Continuar
              </button>
              <button type="button" onClick={() => descartarBorrador(clave)} className="font-bold text-slate-500 hover:underline">Descartar</button>
            </div>
          );
        })}

        <ChatFooter
          contactRole={contact.role}
          esCliente={esCliente}
          contactPhone={contact.phone}
          onSendMessage={handleSendTextMessage}
          onOpenQuote={() => { forms.setQuoteField('clientPhone', (contact.phone || '')); forms.setQuoteField('clientDocumento', contact.documento || ''); forms.openModal('quote'); }}
          onOpenCollection={() => forms.openModal('collection')}
          onOpenInvoice={() => forms.openModal('invoice')}
          onOpenReceipt={() => forms.openModal('receipt')}
          onOpenExpense={() => forms.openModal('expense')}
          onOpenProductPicker={() => forms.openModal('productPicker')}
          onTriggerDocumentInput={fileUpload.triggerDocumentInput}
          onCameraCapture={handleCameraCapture}
        />

        {/* ── Modals ── */}
        <ExpenseModal
          show={forms.modals.expense} onClose={() => forms.closeModal('expense')}
          contact={contact} allContacts={allContacts}
          amount={forms.expense.amount} description={forms.expense.description} targetProjectId={forms.expense.targetProjectId}
          onAmountChange={(v) => forms.setExpenseField('amount', v)} onDescriptionChange={(v) => forms.setExpenseField('description', v)} onTargetProjectChange={(v) => forms.setExpenseField('targetProjectId', v)}
          onSave={handleSaveExpense}
        />
        <InvoiceModal
          show={forms.modals.invoice} onClose={() => forms.closeModal('invoice')}
          items={forms.invoice.items} selectedProject={forms.invoice.selectedProject} taxType={forms.invoice.taxType}
          uniqueApprovedProjects={approvedProjects}
          onAddItem={forms.addInvoiceItem} onUpdateItem={forms.updateInvoiceItem} onDeleteItem={forms.deleteInvoiceItem}
          onSelectProject={(v) => forms.setInvoiceField('selectedProject', v)} onChangeTaxType={(v) => forms.setInvoiceField('taxType', v as any)}
          onSend={handleSendInvoice}
        />
        <QuoteModal
          show={forms.modals.quote} onClose={cerrarCotizacion}
          contactRole={contact.role} items={forms.quote.items}
          validDays={forms.quote.validDays} taxType={forms.quote.taxType} taxPercentage={forms.quote.taxPercentage}
          aiuAdmin={forms.quote.aiuAdmin} aiuImprevistos={forms.quote.aiuImprevistos} aiuUtilidad={forms.quote.aiuUtilidad} aiuIva={forms.quote.aiuIva}
          clientAddress={forms.quote.clientAddress} clientPhone={forms.quote.clientPhone} clientDocumento={forms.quote.clientDocumento}
          showProductPicker={forms.quote.showProductPicker} products={products} categories={categories}
          onAddItem={forms.addQuoteItem} onDeleteItem={forms.deleteQuoteItem} onUpdateItem={forms.updateQuoteItem} onUpdateItemPrice={forms.updateQuoteItemPrice}
          onAddProductToQuote={forms.addProductToQuote} onShowProductPicker={(v) => forms.setQuoteField('showProductPicker', v)}
          onImageUpload={(e, idx) => fileUpload.handleQuoteImageUpload(e, idx, forms.addQuoteItemImages)} onRemoveImage={forms.removeQuoteItemImage} onUpdateItemImage={forms.updateQuoteItemImage}
          onSetValidDays={(v) => forms.setQuoteField('validDays', v)} onSetTaxType={(v) => forms.setQuoteField('taxType', v as any)} onSetTaxPercentage={(v) => forms.setQuoteField('taxPercentage', v)}
          onSetAIUAdmin={(v) => forms.setQuoteField('aiuAdmin', v)} onSetAIUImprevistos={(v) => forms.setQuoteField('aiuImprevistos', v)} onSetAIUUtilidad={(v) => forms.setQuoteField('aiuUtilidad', v)} onSetAIUIva={(v) => forms.setQuoteField('aiuIva', v)}
          onSetClientAddress={(v) => forms.setQuoteField('clientAddress', v)} onSetClientPhone={(v) => forms.setQuoteField('clientPhone', v)} onSetClientDocumento={(v) => forms.setQuoteField('clientDocumento', v)} onPreview={abrirVistaPrevia}
          titulo={origenCotizacion
            ? (origenCotizacion.tipo === 'edicion' ? 'Editar Cotización' : 'Copiar Cotización')
            : undefined}
          etiquetaEnviar={origenCotizacion
            ? (origenCotizacion.tipo === 'edicion' ? 'Guardar cambios' : 'Crear copia')
            : undefined}
          aviso={origenCotizacion ? (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
              <p className="font-bold mb-0.5">
                <i className={`fa-solid ${origenCotizacion.tipo === 'edicion' ? 'fa-pen' : 'fa-copy'} mr-1.5`}></i>
                {origenCotizacion.tipo === 'edicion' ? `Editando la ${origenCotizacion.numero}` : `Copia de la ${origenCotizacion.numero}`}
              </p>
              <p className="leading-snug">
                {borradorRetomado && <b>Retomaste tu borrador, con lo que ya habías cambiado. </b>}
                {origenCotizacion.tipo === 'edicion'
                  ? 'Al guardar, la cotización cambia en el chat con el mismo número y vuelve a quedar pendiente.'
                  : 'Cambia lo que haga falta. Al crearla sale como una cotización nueva, con su propio número; la original no se toca.'}
                {borradorRetomado && fotosPerdidas > 0 && ` Las fotos recién tomadas no se guardan en el borrador: vuelve a agregar las ${fotosPerdidas}.`}
              </p>
              {borradorRetomado && (
                <button
                  type="button"
                  onClick={() => {
                    const original = messages.find(m => m.id === origenCotizacion.messageId);
                    if (original) abrirDesdeCotizacion(original, origenCotizacion.tipo, true);
                  }}
                  className="mt-1.5 font-bold text-blue-800 underline"
                >
                  Empezar de nuevo desde la original
                </button>
              )}
            </div>
          ) : borradorRetomado ? (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <p className="font-bold mb-0.5"><i className="fa-solid fa-clock-rotate-left mr-1.5"></i>Retomaste tu borrador</p>
              <p className="leading-snug">
                Quedó guardado lo que escribiste.
                {fotosPerdidas > 0 && ` Las fotos recién tomadas no se guardan en el borrador: vuelve a agregar las ${fotosPerdidas}.`}
              </p>
              <button type="button" onClick={empezarDeCero} className="mt-1.5 font-bold text-amber-800 underline">
                Empezar de cero
              </button>
            </div>
          ) : undefined}
          paymentAccounts={paymentAccounts}
          anticipoPorcentaje={forms.quote.anticipoPorcentaje}
          cuentaCobroId={forms.quote.cuentaCobroId}
          condiciones={forms.quote.condiciones}
          onSetAnticipo={(v) => forms.setQuoteField('anticipoPorcentaje', v)}
          onSetCuentaCobro={(v) => forms.setQuoteField('cuentaCobroId', v)}
          onSetCondicion={forms.setCondicion}
          onGuardarPlantilla={guardarCondicionesComoPlantilla}
          guardandoPlantilla={guardandoPlantilla}
          plantillaGuardada={plantillaGuardada}
          onSend={handleSendQuote}
          enviando={enviandoCotizacion}
          isPro={userProfile?.isPro} trialEndsAt={userProfile?.trialEndsAt} subscriptionEndsAt={userProfile?.subscriptionEndsAt}
          businessType={userProfile?.businessType}
          mode={forms.quote.mode} sections={forms.quote.sections}
          onSetMode={forms.setQuoteMode} onAddSection={forms.addCarpentrySection} onRemoveSection={forms.removeCarpentrySection}
          onAddCarpentryItem={forms.addCarpentryItem} onUpdateCarpentryItem={forms.updateCarpentryItem} onRemoveCarpentryItem={forms.removeCarpentryItem} onUpdateGroupLabel={forms.updateCarpentryGroupLabel} onUpdateSectionName={forms.updateCarpentrySectionName}
        />
        <CollectionModal
          show={forms.modals.collection} onClose={() => forms.closeModal('collection')}
          uniqueApprovedProjects={approvedProjects} paymentAccounts={paymentAccounts}
          amount={forms.collection.amount} concept={forms.collection.concept} directedTo={forms.collection.directedTo} nit={forms.collection.nit} selectedAccount={forms.collection.selectedAccount} selectedProject={forms.collection.selectedProject}
          onAmountChange={(v) => forms.setCollectionField('amount', v)} onConceptChange={(v) => forms.setCollectionField('concept', v)} onDirectedToChange={(v) => forms.setCollectionField('directedTo', v)} onNitChange={(v) => forms.setCollectionField('nit', v)} onAccountChange={(v) => forms.setCollectionField('selectedAccount', v)} onProjectChange={(v) => forms.setCollectionField('selectedProject', v)}
          onSend={handleSendCollection}
        />
        <ReceiptModal
          show={forms.modals.receipt} onClose={() => forms.closeModal('receipt')}
          contactRole={contact.role} uniqueApprovedProjects={approvedProjects} paymentAccounts={paymentAccounts}
          amount={forms.receipt.amount} concept={forms.receipt.concept} selectedAccount={forms.receipt.selectedAccount}
          selectedProject={forms.receipt.selectedProject}
          onAmountChange={(v) => forms.setReceiptField('amount', v)} onConceptChange={(v) => forms.setReceiptField('concept', v)} onAccountChange={(v) => forms.setReceiptField('selectedAccount', v)}
          onProjectChange={(v) => forms.setReceiptField('selectedProject', v)}
          onSend={handleSendReceipt}
        />
        <ProductPickerModal
          show={forms.modals.productPicker} onClose={() => forms.closeModal('productPicker')}
          products={products} categories={categories} onSelectProduct={handleSelectProduct}
        />
        <PaymentConfirmModal
          show={forms.modals.paymentConfirm} pendingPayment={forms.pendingPayment}
          onClose={() => { forms.setPendingPayment(null); forms.closeModal('paymentConfirm'); }}
          onConfirm={handleConfirmPayment}
        />
        <QRPreviewModal
          show={forms.modals.qrPreview} qrData={forms.qrPreviewData} copiedText={forms.copiedText}
          onClose={() => { forms.setQrPreviewData(null); forms.closeModal('qrPreview'); }}
          onCopyPaymentInfo={handleCopyPaymentInfo}
        />
      </div>

      {/* Info Panel */}
      <InfoPanel
        show={showInfo}
        onClose={() => setShowInfo(false)}
        contact={contact}
        messages={messages}
        showSystemMessages={showSystemMessages}
        onViewDocument={(type: any, data: any) => setViewingDocument({ type, data })}
        onUpdateProjectInfo={onUpdateProjectInfo}
        onAddProject={onAddProject}
        onDeleteProject={onDeleteProject}
        onRenameContact={onRenameContact}
        esCliente={esCliente}
      />

      {/* Hidden file inputs */}
      <input ref={fileUpload.fileInputRef} type="file" accept="image/*" onChange={fileUpload.handleImageUpload} className="hidden" />
      <input ref={fileUpload.cameraInputRef} type="file" accept="image/*" capture="environment" onChange={fileUpload.handleImageUpload} className="hidden" />
      <input ref={fileUpload.documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*" onChange={fileUpload.handleDocumentUpload} className="hidden" />

      {/* Upload Progress */}
      {fileUpload.isUploading && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-500/30 z-50 flex items-center gap-3">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Subiendo archivo... {fileUpload.uploadProgress > 0 ? `${fileUpload.uploadProgress}%` : ''}</span>
        </div>
      )}
    </div>
  );
};
