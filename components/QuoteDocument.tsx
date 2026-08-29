
import React, { useState, useRef, useEffect } from 'react';
import { QuoteData, InvoiceData, ReceiptData, CollectionAccountData, UserProfileData } from '../types';
import { formatCurrency } from '../utils/currency';
import { describeError } from '../utils/errorMessage';
import { shareQuoteViaWhatsApp, shareInvoiceViaWhatsApp, openWhatsApp, generateDocumentId, saveSharedDocument, generateDocumentViewLink } from '../services/whatsappService';
import { publishCatalogForCurrentUser, catalogPageUrl, qrImageUrl, WORKY_APP_URL } from '../services/catalogShareService';
import { getCurrentUserId } from '../services/messagingService';
import { computeLineSubtotal, computeMaterialSubtotal, computeManoDeObraTotal, computeMaterialesTotal, computeGroupSubtotal, computeSectionSubtotal, seccionesConContenido, describeCantidad, describeMaterial } from '../utils/carpentryCalculations';

interface DocumentViewerProps {
  type: 'quote' | 'invoice' | 'receipt' | 'collection_account' | 'expense_receipt';
  data: any;
  onClose: () => void;
  businessLogo?: string;
  digitalSignature?: string;
  userProfile?: UserProfileData | null;
  contactPhone?: string; // Teléfono del contacto para compartir por WhatsApp
}

/** Ancho real de la hoja. Es el que supone la maquetación del documento. */
const ANCHO_HOJA = 850;

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ type, data, onClose, businessLogo, digitalSignature, userProfile, contactPhone }) => {
  /**
   * La hoja se reduce entera para caber en ventanas estrechas.
   *
   * Antes se encogía solo el ancho —`w-full` con un alto mínimo fijo—, así que
   * en una ventana de 500px salía una tira de 500 por 1100 con todo
   * apelotonado. Reduciéndola completa se mantiene la proporción del papel y
   * se lee como un documento, solo que más pequeño. Al imprimir vuelve a su
   * tamaño real (ver la regla de #printable-area en index.html).
   */
  const marco = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  useEffect(() => {
    const medir = () => {
      const disponible = marco.current?.clientWidth ?? ANCHO_HOJA;
      setEscala(Math.min(1, disponible / ANCHO_HOJA));
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  const [signatureScale, setSignatureScale] = useState(1);
  const [signaturePosition, setSignaturePosition] = useState({ x: 0, y: 0 });
  const [showSignature, setShowSignature] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handlePrint = () => {
    window.print();
  };

  const handleShareViaWhatsApp = async () => {
    if (!contactPhone) {
      alert('No hay número de teléfono disponible para compartir');
      return;
    }

    // La pestaña se abre aquí, dentro del clic: lo que viene detrás son varias
    // esperas —publicar el catálogo, subir el documento— y al terminar el
    // navegador ya no ve un gesto del usuario, así que el bloqueador de
    // emergentes descartaba la apertura y el botón no hacía nada.
    const ventana = window.open('', '_blank');
    // Mientras se publica y se sube, la pestaña se queda en blanco y parece
    // rota. Se le pone algo que explique la espera.
    if (ventana) {
      ventana.document.write(
        '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Preparando tu documento…</title></head>' +
        '<body style="font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;color:#64748b;' +
        'display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">' +
        '<p>Preparando tu documento…</p></body></html>',
      );
      ventana.document.close();
    }

    try {
      await compartirPorWhatsApp(ventana);
    } catch (e) {
      ventana?.close();
      console.error('Error compartiendo por WhatsApp:', e);
      alert(`No se pudo compartir el documento: ${describeError(e)}`);
    }
  };

  const compartirPorWhatsApp = async (ventana: Window | null) => {
    // Instantánea del catálogo, para que el documento lleve enlace y QR.
    // Si falla o no hay productos, el documento sale igual, sin ese bloque.
    const negocio = userProfile?.businessName || userProfile?.ownerName || 'nuestro catálogo';
    const catalogLink = await publishCatalogForCurrentUser({
      businessName: userProfile?.businessName ?? '',
      ownerName: userProfile?.ownerName ?? '',
      phone: userProfile?.phone ?? '',
      city: userProfile?.city,
      businessLogo: userProfile?.businessLogo,
    });

    // Generar ID único y guardar documento
    const documentId = generateDocumentId();
    const documentToShare = {
      type,
      data,
      businessLogo,
      userProfile,
      digitalSignature
    };
    await saveSharedDocument(
      documentId,
      documentToShare,
      catalogLink ? { url: catalogLink, negocio } : undefined,
    );
    const documentLink = generateDocumentViewLink(documentId, documentToShare);

    if (type === 'quote') {
      const quoteData = data as QuoteData;
      shareQuoteViaWhatsApp(contactPhone, {
        quoteNumber: quoteData.number,
        clientName: quoteData.clientName,
        total: quoteData.total,
        items: quoteData.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price
        })),
        sections: quoteData.sections,
      }, documentLink, catalogLink ?? undefined, ventana);
    } else if (type === 'invoice') {
      const invoiceData = data as InvoiceData;
      shareInvoiceViaWhatsApp(contactPhone, {
        invoiceNumber: invoiceData.number,
        clientName: invoiceData.clientName,
        total: invoiceData.total,
        dueDate: invoiceData.date
      }, documentLink, catalogLink ?? undefined, ventana);
    } else {
      // Para otros tipos de documentos, enviar un mensaje genérico con link
      const documentName = type === 'receipt' ? 'Recibo' : 
                          type === 'collection_account' ? 'Cuenta de Cobro' : 
                          'Documento';
      const catalogoTexto = catalogLink ? `\n🛒 *Mira nuestro catálogo:*\n${catalogLink}\n` : '';
      openWhatsApp(contactPhone, `📄 Te comparto el ${documentName} generado.\n\n📎 *Ver documento completo:*\n${documentLink}\n${catalogoTexto}\n📲 *Descarga Worky App en Google Play:*\nhttps://play.google.com/store/apps/details?id=com.worky.app.v2&hl=es`, ventana);
    }
  };

  const renderContent = () => {
    const signatureProps = {
      signature: digitalSignature,
      scale: signatureScale,
      position: signaturePosition,
      showSignature: showSignature,
      onDragStart: (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - signaturePosition.x, y: e.clientY - signaturePosition.y });
      },
      onDrag: (e: React.MouseEvent) => {
        if (isDragging) {
          setSignaturePosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
      },
      onDragEnd: () => setIsDragging(false)
    };

    switch (type) {
      case 'invoice': return <InvoiceTemplate data={data as InvoiceData} businessLogo={businessLogo} userProfile={userProfile} {...signatureProps} />;
      case 'quote': return <QuoteTemplate data={data as QuoteData} businessLogo={businessLogo} userProfile={userProfile} {...signatureProps} />;
      case 'collection_account': return <CollectionTemplate data={data as CollectionAccountData} businessLogo={businessLogo} userProfile={userProfile} {...signatureProps} />;
      case 'receipt': return <ReceiptTemplate data={data as ReceiptData} businessLogo={businessLogo} userProfile={userProfile} {...signatureProps} />;
      case 'expense_receipt': return <ExpenseReceiptTemplate data={data as ReceiptData} businessLogo={businessLogo} userProfile={userProfile} {...signatureProps} />;
      default: return null;
    }
  };

  return (
    <div id="document-overlay" className="fixed inset-0 bg-[#0b141a]/95 z-[100] flex flex-col items-center overflow-y-auto animate-fade-in backdrop-blur-sm">
      {/* Toolbar */}
      {/* flex-wrap: en una ventana estrecha esta barra no cabía en una línea y
          empujaba fuera de la pantalla los botones de compartir e imprimir,
          que son justo a lo que se viene. Ahora bajan a la línea siguiente. */}
      <div className="sticky top-0 w-full bg-[#202c33] p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2 shadow-lg z-50 no-print border-b border-gray-700">
        <button 
            onClick={onClose} 
            className="text-[#e9edef] hover:text-[#00a884] transition flex items-center gap-2 font-medium text-lg"
        >
          <i className="fa-solid fa-arrow-left bg-[#37404a] p-2 rounded-full w-10 h-10 flex items-center justify-center"></i>
          <span className="hidden sm:inline">Volver al Chat</span>
        </button>

        <div className="flex flex-wrap gap-2 items-center justify-end">
            {digitalSignature && (
              <>
                <div className="flex items-center gap-2 bg-[#37404a] px-4 py-2 rounded-full">
                  <span className="text-white text-sm">Tamaño Firma:</span>
                  <button onClick={() => setSignatureScale(Math.max(0.5, signatureScale - 0.1))} className="text-white hover:text-[#00a884] px-2">
                    <i className="fa-solid fa-minus"></i>
                  </button>
                  <span className="text-white text-sm w-12 text-center">{Math.round(signatureScale * 100)}%</span>
                  <button onClick={() => setSignatureScale(Math.min(2, signatureScale + 0.1))} className="text-white hover:text-[#00a884] px-2">
                    <i className="fa-solid fa-plus"></i>
                  </button>
                </div>
                <button 
                  onClick={() => setShowSignature(!showSignature)} 
                  className={`${showSignature ? 'bg-[#00a884]' : 'bg-red-500'} text-[#111b21] px-4 py-2 rounded-full font-bold shadow-lg hover:opacity-80 transition flex items-center gap-2`}
                >
                  <i className={`fa-solid ${showSignature ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                  {showSignature ? 'Ocultar' : 'Mostrar'} Firma
                </button>
              </>
            )}
            {contactPhone && (
              <button 
                onClick={handleShareViaWhatsApp} 
                className="bg-[#25D366] text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-[#20BA5A] transition flex items-center gap-2"
              >
                <i className="fa-brands fa-whatsapp"></i> Compartir por WhatsApp
              </button>
            )}
            <button onClick={handlePrint} className="bg-[#00a884] text-[#111b21] px-6 py-2 rounded-full font-bold shadow-lg hover:bg-[#00c298] transition flex items-center gap-2">
            <i className="fa-solid fa-print"></i> Imprimir / PDF
            </button>
        </div>
      </div>

      {/* Printable Area */}
      <div ref={marco} className="py-8 w-full flex justify-center"
        onMouseMove={(e) => isDragging && setSignaturePosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })}
        onMouseUp={() => setIsDragging(false)}
      >
        {/* pb-14: el pie "Generado con Worky" va posicionado abajo del todo, y
            sin este hueco tapaba la última línea del documento. */}
        <div id="printable-area" style={{ zoom: escala }} className="bg-white text-black w-[850px] max-w-full min-h-[1100px] pb-14 shadow-2xl relative rounded-sm animate-slide-in-top overflow-hidden">
            {renderContent()}
            
            {/* Global Footer (Optional) */}
            <div className="absolute bottom-0 w-full text-center p-4 text-[10px] text-gray-300 bg-gray-900 print:bg-transparent print:text-gray-400">
                Generado con Worky
            </div>
        </div>
      </div>
    </div>
  );
};

// --- TEMPLATES ---

interface SignatureProps {
  signature?: string;
  scale: number;
  position: { x: number; y: number };
  showSignature: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onDrag: (e: React.MouseEvent) => void;
  onDragEnd: () => void;
}

const QuoteTemplate = ({ data, businessLogo, userProfile, signature, scale, position, showSignature, onDragStart, onDrag, onDragEnd }: { data: QuoteData, businessLogo?: string, userProfile?: UserProfileData | null } & Partial<SignatureProps>) => {
    // El QR lleva al catálogo, que es lo que promete el texto de debajo.
    // Antes codificaba una vCard con los datos del negocio: al escanearlo se
    // guardaba un contacto y no se llegaba a ninguna parte. Es el mismo enlace
    // que el QR del catálogo y el que se manda en los documentos compartidos.
    // getCurrentUserId lanza si no hay sesión, y esto corre al pintar: sin el
    // resguardo, un documento abierto sin sesión tumbaría la pantalla entera.
    const enlaceCatalogo = (() => {
      try {
        return catalogPageUrl(getCurrentUserId());
      } catch {
        return WORKY_APP_URL;
      }
    })();
    const qrCodeUrl = qrImageUrl(enlaceCatalogo, 120);
    
    return (
    <div className="p-16 h-full relative bg-white">
        {/* Modern Header with Logo */}
        <div className="mb-10 pb-8 border-b-2 border-blue-600">
            <div className="flex justify-between items-start gap-6 mb-4">
                <div className="flex-1">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">COTIZACIÓN</h1>
                    <p className="text-lg text-blue-600 font-semibold mb-4">No. {data.number}</p>
                    {/* Client & Date Info - Left side, stacked vertically */}
                    <div className="flex flex-col gap-2">
                        <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-600">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Cliente</p>
                            <p className="text-sm font-bold text-gray-900">{data.clientName}</p>
                            {data.clientAddress && (
                                <p className="text-xs text-gray-600 mt-1">{data.clientAddress}</p>
                            )}
                            {data.clientPhone && (
                                <p className="text-xs text-gray-600 mt-0.5">{data.clientPhone}</p>
                            )}
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-600">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Fecha</p>
                            <p className="text-sm font-bold text-gray-900">{new Date(data.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{new Date(data.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    {/* QR Code Centered */}
                    <div className="flex flex-col items-center mb-4">
                        <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 border-2 border-gray-200 rounded" />
                        <p className="text-[10px] text-gray-600 mt-1 font-medium text-center">Escanea para entrar<br/>a mi catálogo</p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    {businessLogo && (
                        <img src={businessLogo} alt="Logo" className="h-24 w-auto object-contain mb-4" />
                    )}
                    <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 mb-1">{userProfile?.businessName || ''}</p>
                        {userProfile?.nit && <p className="text-xs text-gray-600">NIT: {userProfile.nit}</p>}
                        {userProfile?.address && <p className="text-xs text-gray-600">{userProfile.address}</p>}
                        <p className="text-xs text-gray-600">{userProfile?.city || 'Bogotá'}, {userProfile?.country || 'Colombia'}</p>
                        {userProfile?.phone && <p className="text-xs text-gray-600">{userProfile.phone}</p>}
                    </div>
                </div>
            </div>
        </div>

        {/* Items Table */}
        <div className="mb-10">
            {seccionesConContenido(data.sections || []).length > 0 ? (
                <div className="space-y-6">
                    {seccionesConContenido(data.sections || []).map((section) => (
                        <div key={section.id}>
                            <div className="bg-blue-600 text-white px-3 py-2 rounded-t-lg">
                                <span className="text-sm font-bold uppercase tracking-wide">{section.name}</span>
                            </div>
                            <div className="border border-t-0 border-gray-200 rounded-b-lg overflow-hidden">
                                {section.groups.map((group) => (
                                    <div key={group.id}>
                                        <div className="bg-gray-50 px-3 py-1.5 border-t border-gray-200">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{group.label}</span>
                                        </div>
                                        <table className="w-full">
                                            <tbody>
                                                {group.items.map((item) => (
                                                    <React.Fragment key={item.id}>
                                                    <tr className="border-t border-gray-100">
                                                        <td className="py-2 px-3 text-sm text-gray-800">
                                                            {item.description}
                                                            {/* Las fotos del ítem: se podían adjuntar en el
                                                                formulario pero no llegaban al documento. */}
                                                            {item.images && item.images.length > 0 && (
                                                                <div className="flex gap-1.5 mt-1.5">
                                                                    {item.images.slice(0, 3).map((img, i) => (
                                                                        <img key={i} src={img} className="w-20 h-20 rounded object-cover border border-gray-200" />
                                                                    ))}
                                                                    {item.images.length > 3 && (
                                                                        <div className="w-20 h-20 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 font-bold">
                                                                            +{item.images.length - 3}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-2 text-center text-xs text-gray-500 w-20">{describeCantidad(item)}</td>
                                                        <td className="py-2 px-3 text-right text-sm text-gray-700 w-28">{formatCurrency(item.unitCost)}</td>
                                                        <td className="py-2 px-3 text-right text-sm font-bold text-gray-900 w-28">{formatCurrency(computeLineSubtotal(item))}</td>
                                                    </tr>
                                                    {/* El material, sangrado bajo su trabajo. */}
                                                    {computeMaterialSubtotal(item) > 0 && (
                                                    <tr className="border-b border-gray-100">
                                                        <td className="py-1.5 px-3 pl-8 text-xs text-gray-600">
                                                            ↳ Material{item.material?.descripcion?.trim() ? `: ${item.material.descripcion}` : ''}
                                                        </td>
                                                        <td className="py-1.5 px-2 text-center text-xs text-gray-500 w-20">{describeMaterial(item.material)}</td>
                                                        <td className="py-1.5 px-3 text-right text-xs text-gray-600 w-28">{formatCurrency(item.material?.unitCost || 0)}</td>
                                                        <td className="py-1.5 px-3 text-right text-xs font-semibold text-gray-700 w-28">{formatCurrency(computeMaterialSubtotal(item))}</td>
                                                    </tr>
                                                    )}
                                                    </React.Fragment>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="flex justify-end px-3 py-1.5 bg-gray-50 border-t border-gray-100">
                                            <span className="text-xs font-semibold text-gray-600">Subtotal {group.label}: {formatCurrency(computeGroupSubtotal(group))}</span>
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-end px-3 py-2 bg-blue-50 border-t border-blue-100">
                                    <span className="text-sm font-bold text-blue-700">Subtotal {section.name}: {formatCurrency(computeSectionSubtotal(section))}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
            <table className="w-full">
                <thead>
                    <tr className="bg-blue-600 text-white">
                        <th className="text-left py-2 px-3 text-sm font-semibold">Descripción</th>
                        <th className="text-center py-2 px-2 text-sm font-semibold w-16">Cant.</th>
                        <th className="text-right py-2 px-3 text-sm font-semibold w-24">Precio Unit.</th>
                        <th className="text-right py-2 px-3 text-sm font-semibold w-24">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-3">
                                <div className="flex items-center gap-3">
                                    {(item.images && item.images.length > 0) ? (
                                        <div className="flex gap-2">
                                            {item.images.slice(0, 3).map((img, imgIdx) => (
                                                <img key={imgIdx} src={img} className="w-24 h-24 rounded object-cover border border-gray-200" />
                                            ))}
                                            {item.images.length > 3 && (
                                                <div className="w-24 h-24 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-bold">
                                                    +{item.images.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    ) : item.image && (
                                        <img src={item.image} className="w-24 h-24 rounded object-cover border border-gray-200" />
                                    )}
                                    <span className="text-gray-800 text-sm font-medium">{item.description}</span>
                                </div>
                            </td>
                            <td className="py-3 px-2 text-center text-sm text-gray-700">{item.quantity}</td>
                            <td className="py-3 px-3 text-right text-sm text-gray-700">{formatCurrency(item.price)}</td>
                            <td className="py-3 px-3 text-right text-sm font-bold text-gray-900">{formatCurrency((item.price * item.quantity))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            )}
        </div>

        {/* Total Section */}
        <div className="flex justify-end mb-12">
            <div className="w-96">
                {/* Cuánto es trabajo y cuánto material. Solo si hay material:
                    en una cotización de pura mano de obra el desglose confunde. */}
                {computeMaterialesTotal(data.sections || []) > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-3 space-y-1.5">
                        <div className="flex justify-between text-sm text-gray-700">
                            <span>Mano de obra</span>
                            <span className="font-semibold">{formatCurrency(computeManoDeObraTotal(data.sections || []))}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-700">
                            <span>Materiales</span>
                            <span className="font-semibold">{formatCurrency(computeMaterialesTotal(data.sections || []))}</span>
                        </div>
                    </div>
                )}
                {(data.taxType && data.taxType !== 'none' && data.subtotal) && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-3">
                        <div className="flex justify-between py-2 text-gray-700">
                            <span>Subtotal</span>
                            <span className="font-semibold">{formatCurrency((data.subtotal || data.total))}</span>
                        </div>
                        {data.taxAmount && data.taxAmount > 0 && (
                            <>
                                {data.taxType === 'aiu' ? (
                                    <>
                                        {(() => {
                                            const subtotal = data.subtotal || data.total;
                                            const adminPorcentaje = data.aiuAdmin || 5;
                                            const imprevistosPorcentaje = data.aiuImprevistos || 5;
                                            const utilidadPorcentaje = data.aiuUtilidad || 5;
                                            const ivaPorcentaje = data.aiuIva || 19;
                                            
                                            const administracion = subtotal * (adminPorcentaje / 100);
                                            const imprevistos = subtotal * (imprevistosPorcentaje / 100);
                                            const utilidad = subtotal * (utilidadPorcentaje / 100);
                                            const ivaUtilidad = utilidad * (ivaPorcentaje / 100);
                                            
                                            return (
                                                <>
                                                    <div className="flex justify-between py-2 text-gray-700 border-t border-gray-200">
                                                        <span>Administración ({adminPorcentaje}%)</span>
                                                        <span className="font-semibold">{formatCurrency(administracion)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 text-gray-700">
                                                        <span>Imprevistos ({imprevistosPorcentaje}%)</span>
                                                        <span className="font-semibold">{formatCurrency(imprevistos)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 text-gray-700">
                                                        <span>Utilidad ({utilidadPorcentaje}%)</span>
                                                        <span className="font-semibold">{formatCurrency(utilidad)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 text-gray-700">
                                                        <span>IVA sobre Utilidad ({ivaPorcentaje}%)</span>
                                                        <span className="font-semibold">{formatCurrency(ivaUtilidad)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-2 text-gray-700 border-t border-gray-300 font-semibold">
                                                        <span>Total AIU</span>
                                                        <span>{formatCurrency(data.taxAmount)}</span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <div className="flex justify-between py-2 text-gray-700 border-t border-gray-200">
                                        <span>
                                            {data.taxType === 'percentage' && data.taxPercentage 
                                                ? `Impuesto (${data.taxPercentage}%)`
                                                : 'Impuesto'}
                                        </span>
                                        <span className="font-semibold">{formatCurrency(data.taxAmount)}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
                <div className="bg-blue-600 text-white p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">TOTAL</span>
                        <span className="text-3xl font-bold">{formatCurrency(data.total)}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Valid Until */}
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded mb-8">
            <p className="text-sm text-gray-700">
                <span className="font-bold">Válida hasta:</span> {new Date(data.validUntil).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>

        {/* Signature */}
        {signature && showSignature && (
            <div className="mb-8 no-print-controls">
                <div className="flex justify-end">
                    <div 
                        className="text-center cursor-move hover:ring-2 hover:ring-blue-500 rounded p-2 transition"
                        onMouseDown={onDragStart}
                        style={{ transform: `scale(${scale})`, userSelect: 'none' }}
                    >
                        <img src={signature} alt="Firma" className="h-20 w-auto mb-2" draggable={false} />
                        <div className="border-t-2 border-gray-800 pt-2">
                            <p className="text-sm font-semibold text-gray-800">Firma Autorizada</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Gracias por su preferencia</p>
        </div>
    </div>
    );
};

const InvoiceTemplate = ({ data, businessLogo, userProfile, signature, scale, position, showSignature, onDragStart, onDrag, onDragEnd }: { data: InvoiceData, businessLogo?: string, userProfile?: UserProfileData | null } & Partial<SignatureProps>) => (
    <div className="p-16 h-full relative bg-white">
        {/* Modern Header */}
        <div className="mb-10 pb-8 border-b-2 border-purple-600">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">FACTURA</h1>
                    <p className="text-lg text-purple-600 font-semibold">No. {data.number}</p>
                </div>
                <div className="text-right flex flex-col items-end">
                    {businessLogo && (
                        <img src={businessLogo} alt="Logo" className="h-16 w-auto object-contain mb-3" />
                    )}
                    <p className="text-sm font-bold text-gray-900 mb-2">{userProfile?.businessName || ''}</p>
                    {userProfile?.nit && <p className="text-xs text-gray-600">NIT: {userProfile.nit}</p>}
                    {userProfile?.address && <p className="text-xs text-gray-600">{userProfile.address}</p>}
                    <p className="text-xs text-gray-600">{userProfile?.city || 'Bogotá'}, {userProfile?.country || 'Colombia'}</p>
                    {userProfile?.phone && <p className="text-xs text-gray-600">{userProfile.phone}</p>}
                </div>
            </div>
        </div>

        {/* Client & Date Info */}
        <div className="grid grid-cols-2 gap-8 mb-10">
            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-purple-600">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Facturado a</p>
                <p className="text-xl font-bold text-gray-900">{data.clientName}</p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-purple-600">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha de Emisión</p>
                <p className="text-xl font-bold text-gray-900">{new Date(data.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm text-gray-600 mt-1">{new Date(data.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        </div>

        {/* Items Table */}
        <div className="mb-10">
            <table className="w-full">
                <thead>
                    <tr className="bg-purple-600 text-white">
                        <th className="text-left py-3 px-4 font-semibold">Descripción</th>
                        <th className="text-center py-3 px-3 font-semibold w-20">Cant.</th>
                        <th className="text-right py-3 px-4 font-semibold w-32">Precio Unit.</th>
                        <th className="text-right py-3 px-4 font-semibold w-32">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-4 px-4 text-gray-800 font-medium">{item.description}</td>
                            <td className="py-4 px-3 text-center text-gray-700">{item.quantity}</td>
                            <td className="py-4 px-4 text-right text-gray-700">{formatCurrency(item.price)}</td>
                            <td className="py-4 px-4 text-right font-bold text-gray-900">{formatCurrency((item.price * item.quantity))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Total Section */}
        <div className="flex justify-end mb-12">
            <div className="w-96">
                <div className="bg-gray-50 p-4 rounded-lg mb-3">
                    <div className="flex justify-between py-2 text-gray-700">
                        <span>Subtotal</span>
                        <span className="font-semibold">{formatCurrency(data.total)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-gray-700 border-t border-gray-200">
                        <span>IVA (19%)</span>
                        <span className="font-semibold">{formatCurrency((data.total * 0.19))}</span>
                    </div>
                </div>
                <div className="bg-purple-600 text-white p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">TOTAL</span>
                        <span className="text-3xl font-bold">{formatCurrency((data.total * 1.19))}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Signature */}
        {signature && showSignature && (
            <div className="mb-8 no-print-controls">
                <div className="flex justify-end">
                    <div 
                        className="text-center cursor-move hover:ring-2 hover:ring-purple-500 rounded p-2 transition"
                        onMouseDown={onDragStart}
                        style={{ transform: `scale(${scale})`, userSelect: 'none' }}
                    >
                        <img src={signature} alt="Firma" className="h-20 w-auto mb-2" draggable={false} />
                        <div className="border-t-2 border-gray-800 pt-2">
                            <p className="text-sm font-semibold text-gray-800">Firma Autorizada</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Gracias por su confianza</p>
        </div>
    </div>
);

const CollectionTemplate = ({ data, businessLogo, userProfile, signature, scale, position, showSignature, onDragStart, onDrag, onDragEnd }: { data: CollectionAccountData, businessLogo?: string, userProfile?: UserProfileData | null } & Partial<SignatureProps>) => (
    <div className="p-16 h-full relative bg-white">
        {/* Header with Logo */}
        <div className="text-center mb-12 pb-8 border-b-2 border-emerald-600">
            {businessLogo && (
                <img src={businessLogo} alt="Logo" className="h-20 w-auto object-contain mx-auto mb-6" />
            )}
            <h1 className="text-4xl font-bold text-gray-900 mb-3">CUENTA DE COBRO</h1>
            <p className="text-lg text-emerald-600 font-semibold">No. {data.number}</p>
        </div>

        {/* Body Content */}
        <div className="mb-12 text-lg leading-relaxed text-gray-700">
            <div className="bg-gray-50 p-6 rounded-lg mb-8">
                <p className="mb-4">
                    <span className="font-bold text-gray-900">Dirigido a:</span><br/>
                    <span className="text-xl font-semibold text-emerald-700">{data.directedTo}</span>
                </p>
                {data.nit && (
                    <p className="text-sm text-gray-600">NIT/CC: {data.nit}</p>
                )}
            </div>

            <p className="mb-6">
                <span className="font-bold text-gray-900">Debe a:</span><br/>
                {userProfile?.businessName || ''} / {userProfile?.ownerName || 'Representante Legal'}
            </p>
        </div>

        {/* Amount Section */}
        <div className="bg-emerald-600 text-white p-8 rounded-lg mb-8 shadow-lg">
            <p className="text-sm uppercase tracking-wider mb-2 opacity-90">La suma de:</p>
            <p className="text-4xl font-bold mb-4">{formatCurrency(data.amount)}</p>
            <p className="text-sm uppercase tracking-wider mb-2 opacity-90">Por concepto de:</p>
            <p className="text-xl font-medium italic">"{data.concept}"</p>
        </div>

        {/* Bank Info */}
        {(data.bankName || data.accountType || data.accountNumber) && (
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-12">
                <p className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">
                    <i className="fa-solid fa-building-columns text-blue-600"></i>
                    Datos Bancarios para Consignación
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
                    {data.bankName && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">Banco</p>
                            <p className="font-semibold">{data.bankName}</p>
                        </div>
                    )}
                    {data.accountType && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">Tipo de Cuenta</p>
                            <p className="font-semibold">{data.accountType}</p>
                        </div>
                    )}
                    {data.accountNumber && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">Número de Cuenta</p>
                            <p className="font-semibold">{data.accountNumber}</p>
                        </div>
                    )}
                    {data.holderName && (
                        <div>
                            <p className="text-xs text-gray-500 uppercase mb-1">Titular</p>
                            <p className="font-semibold">{data.holderName}</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Signature Section */}
        <div className="mt-16 pt-8 border-t border-gray-300">
            <div className="flex justify-between items-end">
                <div>
                    {signature && showSignature ? (
                        <div 
                            className="mb-4 cursor-move hover:ring-2 hover:ring-emerald-500 rounded p-2 transition no-print-controls"
                            onMouseDown={onDragStart}
                            style={{ transform: `scale(${scale})`, userSelect: 'none' }}
                        >
                            <img src={signature} alt="Firma" className="h-20 w-auto mb-2" draggable={false} />
                        </div>
                    ) : null}
                    <div className="border-t-2 border-gray-800 w-64 pt-2 mb-1">
                        <p className="font-bold text-gray-900">Firma Autorizada</p>
                    </div>
                    <p className="text-sm text-gray-600">C.C. 123.456.789</p>
                </div>
                <div className="text-sm text-gray-500">
                    <p>Fecha: {new Date(data.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} - {new Date(data.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>
        </div>
    </div>
);

const ReceiptTemplate = ({ data, businessLogo, userProfile, signature, scale, position, showSignature, onDragStart, onDrag, onDragEnd }: { data: ReceiptData, businessLogo?: string, userProfile?: UserProfileData | null } & Partial<SignatureProps>) => (
    <div className="p-16 h-full relative bg-white">
        {/* Paid Stamp */}
        <div className="absolute top-20 right-20 border-4 border-green-600 text-green-600 p-4 rounded-lg rotate-[-15deg] opacity-90 shadow-lg">
            <p className="text-3xl font-black uppercase">PAGADO</p>
        </div>
        
        {/* Header */}
        <div className="mb-10 pb-8 border-b-2 border-gray-900">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    {businessLogo && (
                        <img src={businessLogo} alt="Logo" className="h-16 w-auto object-contain mb-4" />
                    )}
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">RECIBO DE CAJA</h1>
                    <p className="text-lg text-gray-600 font-mono">No. {data.number}</p>
                </div>
                <div className="bg-emerald-600 text-white p-6 rounded-lg text-center shadow-lg">
                    <p className="text-xs uppercase tracking-wider mb-1">Valor</p>
                    <p className="text-3xl font-bold">{formatCurrency(data.amount)}</p>
                </div>
            </div>
        </div>

        {/* Details */}
        <div className="space-y-6 mb-12">
            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-emerald-600">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha</p>
                <p className="text-lg font-semibold text-gray-900">{new Date(data.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm text-gray-600 mt-1">{new Date(data.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-emerald-600">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recibí de</p>
                <p className="text-lg font-semibold text-gray-900">Cliente / Pagador</p>
            </div>

            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-emerald-600">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">La suma de</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.amount)}</p>
            </div>

            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-emerald-600">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Por concepto de</p>
                <p className="text-lg text-gray-900">{data.concept}</p>
            </div>

            {data.paymentMethod && (
                <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-emerald-600">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Forma de Pago</p>
                    <p className="text-lg font-semibold text-gray-900">{data.paymentMethod}</p>
                </div>
            )}
        </div>

        {/* Signature Section */}
        <div className="mt-20 pt-8 border-t-2 border-gray-300">
            <div className="flex justify-between items-end">
                <div>
                    {signature && showSignature ? (
                        <div 
                            className="mb-4 cursor-move hover:ring-2 hover:ring-green-500 rounded p-2 transition no-print-controls"
                            onMouseDown={onDragStart}
                            style={{ transform: `scale(${scale})`, userSelect: 'none' }}
                        >
                            <img src={signature} alt="Firma" className="h-20 w-auto mb-2" draggable={false} />
                        </div>
                    ) : null}
                    <div className="border-t-2 border-gray-900 w-64 pt-2 mb-1">
                        <p className="font-bold text-gray-900">Firma y Sello</p>
                    </div>
                    <p className="text-sm text-gray-600">Quien Recibe</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                    <p className="font-semibold">{userProfile?.businessName || ''}</p>
                    {userProfile?.nit && <p>NIT: {userProfile.nit}</p>}
                </div>
            </div>
        </div>
    </div>
);

const ExpenseReceiptTemplate = ({ data, businessLogo, userProfile, signature, scale, position, showSignature, onDragStart, onDrag, onDragEnd }: { data: ReceiptData, businessLogo?: string, userProfile?: UserProfileData | null } & Partial<SignatureProps>) => (
    <div className="p-16 h-full relative bg-white">
        {/* Header */}
        <div className="mb-10 pb-8 border-b-2 border-gray-900">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    {businessLogo && (
                        <img src={businessLogo} alt="Logo" className="h-16 w-auto object-contain mb-4" />
                    )}
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">RECIBO DE GASTO</h1>
                    <p className="text-lg text-gray-600 font-mono">No. {data.number}</p>
                </div>
                <div className="bg-rose-600 text-white p-6 rounded-lg text-center shadow-lg">
                    <p className="text-xs uppercase tracking-wider mb-1">Valor</p>
                    <p className="text-3xl font-bold">-{formatCurrency(data.amount)}</p>
                </div>
            </div>
        </div>

        {/* Details */}
        <div className="space-y-6 mb-12">
            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-rose-600">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fecha</p>
                <p className="text-lg font-semibold text-gray-900">{new Date(data.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm text-gray-600 mt-1">{new Date(data.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            {data.projectName && (
                <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-rose-600">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Proyecto</p>
                    <p className="text-lg font-semibold text-gray-900">{data.projectName}</p>
                </div>
            )}

            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-rose-600">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Monto Gastado</p>
                <p className="text-2xl font-bold text-rose-700">-{formatCurrency(data.amount)}</p>
            </div>

            <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-rose-600">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Concepto del Gasto</p>
                <p className="text-lg text-gray-900">{data.concept}</p>
            </div>

            {data.paymentMethod && (
                <div className="bg-gray-50 p-5 rounded-lg border-l-4 border-rose-600">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Método de Pago</p>
                    <p className="text-lg font-semibold text-gray-900">{data.paymentMethod}</p>
                </div>
            )}
        </div>

        {/* Signature Section */}
        <div className="mt-20 pt-8 border-t-2 border-gray-300">
            <div className="flex justify-between items-end">
                <div>
                    {signature && showSignature ? (
                        <div 
                            className="mb-4 cursor-move hover:ring-2 hover:ring-rose-500 rounded p-2 transition no-print-controls"
                            onMouseDown={onDragStart}
                            style={{ transform: `scale(${scale})`, userSelect: 'none' }}
                        >
                            <img src={signature} alt="Firma" className="h-20 w-auto mb-2" draggable={false} />
                        </div>
                    ) : null}
                    <div className="border-t-2 border-gray-900 w-64 pt-2 mb-1">
                        <p className="font-bold text-gray-900">Firma y Autorización</p>
                    </div>
                    <p className="text-sm text-gray-600">Registrado Por</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                    <p className="font-semibold">{userProfile?.businessName || ''}</p>
                    {userProfile?.nit && <p>NIT: {userProfile.nit}</p>}
                    <p className="mt-2 text-rose-600 font-bold">COMPROBANTE INTERNO</p>
                </div>
            </div>
        </div>
    </div>
);

