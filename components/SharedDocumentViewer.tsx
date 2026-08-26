import React, { useEffect, useState } from 'react';
import { getSharedDocument, WORKY_PLAY_STORE_URL } from '../services/whatsappService';
import { esLineaUsada } from '../utils/carpentryCalculations';

interface SharedDocumentViewerProps {
  documentId: string;
  onClose: () => void;
}

export const SharedDocumentViewer: React.FC<SharedDocumentViewerProps> = ({ documentId, onClose }) => {
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDoc = async () => {
      setLoading(true);
      try {
        const doc = await getSharedDocument(documentId);
        if (!isMounted) return;
        if (doc) {
          if (doc.expiresAt && new Date(doc.expiresAt) < new Date()) {
            setError('Este documento ha expirado');
          } else {
            setDocument(doc);
          }
        } else {
          setError('Documento no encontrado');
        }
      } catch (err) {
        if (isMounted) setError('Error cargando documento');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDoc();
    return () => { isMounted = false; };
  }, [documentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full border border-slate-100">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-slate-800 font-bold text-base">Cargando documento...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-file-circle-xmark text-3xl"></i>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">{error}</h1>
          <p className="text-slate-500 text-sm mb-6">El documento que buscas no está disponible o el enlace ha caducado.</p>
          
          <div className="border-t border-slate-100 pt-6">
            <h2 className="text-base font-bold text-slate-900 mb-2">¿Gestionas proyectos o cotizaciones?</h2>
            <p className="text-slate-500 text-xs mb-5">Descarga Worky App en Google Play y lleva el control total de tu negocio.</p>
            <a 
              href={WORKY_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3.5 rounded-xl font-bold hover:shadow-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 active:scale-[0.99]"
            >
              <i className="fa-brands fa-google-play text-lg"></i>
              <span>Descargar en Google Play</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { type, data, businessLogo, userProfile, digitalSignature } = document;
  
  const getDocumentTitle = () => {
    switch (type) {
      case 'quote': return `Cotización #${data.number || ''}`;
      case 'invoice': return `Factura #${data.number || ''}`;
      case 'receipt': return `Recibo de Pago #${data.number || ''}`;
      case 'collection_account': return `Cuenta de Cobro #${data.number || ''}`;
      default: return 'Documento Comercial';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const hasSections = data.sections && Array.isArray(data.sections) && data.sections.length > 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-12">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {businessLogo ? (
              <img src={businessLogo} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-100 p-0.5 shadow-sm flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">
                <i className="fa-solid fa-briefcase"></i>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 truncate text-sm md:text-base">{userProfile?.businessName || 'Worky'}</h1>
              <p className="text-xs text-blue-600 font-semibold truncate">{getDocumentTitle()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={() => window.print()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
            >
              <i className="fa-solid fa-print"></i>
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>
            <a 
              href={WORKY_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition flex items-center gap-1.5"
            >
              <i className="fa-brands fa-google-play"></i>
              <span className="hidden sm:inline">Worky App</span>
            </a>
          </div>
        </div>
      </div>

      {/* Document Container */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200/80">
          {/* Document Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider mb-2">
                  Documento Oficial
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{getDocumentTitle()}</h2>
                <p className="text-blue-100 text-xs sm:text-sm mt-1">
                  Fecha de emisión: {data.date ? new Date(data.date).toLocaleDateString('es-CO', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) : 'Fecha no especificada'}
                </p>
              </div>
              {businessLogo && (
                <div className="bg-white p-2.5 rounded-2xl shadow-lg self-end sm:self-center">
                  <img src={businessLogo} alt="Logo" className="w-16 h-16 object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Client & Issuer Info */}
          <div className="p-6 sm:p-8 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Dirigido a:</h3>
              <p className="text-lg font-bold text-slate-900">{data.clientName || 'Cliente'}</p>
              {data.clientPhone && (
                <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                  <i className="fa-solid fa-phone text-xs text-blue-500"></i>
                  <span>{data.clientPhone}</span>
                </p>
              )}
              {data.clientAddress && (
                <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-2">
                  <i className="fa-solid fa-location-dot text-xs text-blue-500"></i>
                  <span>{data.clientAddress}</span>
                </p>
              )}
            </div>

            {userProfile && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Emitido por:</h3>
                <p className="text-base font-bold text-slate-900">{userProfile.businessName || userProfile.ownerName}</p>
                {userProfile.ownerName && userProfile.businessName && (
                  <p className="text-xs text-slate-500">{userProfile.ownerName}</p>
                )}
                {userProfile.phone && (
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                    <i className="fa-solid fa-phone text-xs text-indigo-500"></i>
                    <span>{userProfile.phone}</span>
                  </p>
                )}
                {userProfile.city && (
                  <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-2">
                    <i className="fa-solid fa-map-pin text-xs text-indigo-500"></i>
                    <span>{userProfile.city}{userProfile.country ? `, ${userProfile.country}` : ''}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Carpentry Sections Breakdown (if custom quote) */}
          {hasSections && (
            <div className="p-6 sm:p-8 border-b border-slate-100 space-y-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Desglose de Cotización</h3>
              {data.sections.map((section: any, sIdx: number) => (
                <div key={section.id || sIdx} className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-900 text-white px-4 py-2.5 font-bold text-sm flex justify-between items-center">
                    <span>{section.name}</span>
                  </div>
                  <div className="p-4 space-y-4 bg-white">
                    {section.groups?.map((group: any, gIdx: number) => {
                      // Mismo criterio que el resto del documento: las líneas de
                      // plantilla, con sus valores de ejemplo, no se mandan.
                      const activeItems = (group.items || []).filter(esLineaUsada);
                      if (activeItems.length === 0) return null;
                      return (
                        <div key={group.id || gIdx}>
                          <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">{group.label}</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                  <th className="text-left py-2 px-1">Ítem</th>
                                  <th className="text-center py-2 px-1">Medida/Cant.</th>
                                  <th className="text-right py-2 px-1">Costo Unit.</th>
                                  <th className="text-right py-2 px-1">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeItems.map((item: any, iIdx: number) => {
                                  const measureVal = (item.unit === 'ML' || item.unit === 'M2') && item.measure ? item.measure : 1;
                                  const lineSubtotal = (item.quantity || 1) * (item.unitCost || 0) * measureVal;
                                  return (
                                    <tr key={item.id || iIdx} className="border-b border-slate-100">
                                      <td className="py-2.5 px-1 font-semibold text-slate-800">{item.description}</td>
                                      <td className="py-2.5 px-1 text-center text-slate-600">
                                        {item.quantity} {item.unit}{item.measure ? ` (${item.measure} ${item.unit})` : ''}
                                      </td>
                                      <td className="py-2.5 px-1 text-right text-slate-600">{formatCurrency(item.unitCost)}</td>
                                      <td className="py-2.5 px-1 text-right font-bold text-slate-900">{formatCurrency(lineSubtotal)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Standard Items Table */}
          {!hasSections && data.items && data.items.length > 0 && (
            <div className="p-6 sm:p-8 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Detalle de Productos / Servicios</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-600">
                      <th className="text-left py-3 px-2 font-bold uppercase text-xs">Descripción</th>
                      <th className="text-center py-3 px-2 font-bold uppercase text-xs">Cant.</th>
                      <th className="text-right py-3 px-2 font-bold uppercase text-xs">Precio Unitario</th>
                      <th className="text-right py-3 px-2 font-bold uppercase text-xs">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                        <td className="py-3 px-2 font-medium text-slate-800">{item.description}</td>
                        <td className="py-3 px-2 text-center text-slate-600 font-semibold">{item.quantity}</td>
                        <td className="py-3 px-2 text-right text-slate-600">{formatCurrency(item.price)}</td>
                        <td className="py-3 px-2 text-right font-bold text-slate-900">{formatCurrency((item.quantity || 1) * (item.price || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals Summary */}
          <div className="p-6 sm:p-8 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              {data.notes && (
                <div className="text-xs text-slate-500 max-w-sm">
                  <span className="font-bold text-slate-700">Notas:</span> {data.notes}
                </div>
              )}
            </div>
            <div className="w-full sm:w-72 space-y-2">
              {data.subtotal && data.subtotal !== data.total && (
                <div className="flex justify-between text-sm text-slate-600 font-medium">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(data.subtotal)}</span>
                </div>
              )}
              {data.taxAmount && data.taxAmount > 0 && (
                <div className="flex justify-between text-sm text-slate-600 font-medium">
                  <span>Impuestos:</span>
                  <span>{formatCurrency(data.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-base font-extrabold text-slate-900 uppercase">TOTAL:</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-600">{formatCurrency(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Digital Signature (if present) */}
          {(digitalSignature || data.digitalSignature) && (
            <div className="p-6 sm:p-8 border-t border-slate-100 flex justify-end">
              <div className="text-center w-48">
                <img 
                  src={digitalSignature || data.digitalSignature} 
                  alt="Firma Digital" 
                  className="max-h-20 mx-auto object-contain mb-1" 
                />
                <div className="border-t border-slate-300 pt-1 text-xs font-bold text-slate-600">
                  Firma Autorizada
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Google Play Store CTA Banner */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-6 sm:p-8 text-white text-center shadow-xl shadow-blue-500/10 relative overflow-hidden">
          <div className="relative z-10 max-w-lg mx-auto">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fa-brands fa-google-play text-3xl"></i>
            </div>
            <h3 className="text-2xl font-extrabold mb-2">Worky App está en Google Play</h3>
            <p className="text-blue-100 text-sm mb-6 leading-relaxed">
              Crea cotizaciones profesionales, gestiona facturas, recibos y proyectos desde tu celular.
            </p>
            <a 
              href={WORKY_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-extrabold text-base hover:bg-slate-50 transition-all shadow-lg active:scale-[0.99]"
            >
              <i className="fa-brands fa-google-play text-blue-600 text-xl"></i>
              <span>Descargar Worky en Google Play</span>
            </a>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="mt-8 text-center text-slate-400 text-xs pb-6">
          <p>Documento generado digitalmente a través de <span className="font-bold text-blue-600">Worky App</span></p>
        </div>
      </div>
    </div>
  );
};
