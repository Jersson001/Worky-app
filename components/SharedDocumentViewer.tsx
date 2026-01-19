import React, { useEffect, useState } from 'react';
import { getSharedDocument } from '../services/whatsappService';
import { QuoteData, InvoiceData, ReceiptData, CollectionAccountData, UserProfileData } from '../types';

interface SharedDocumentViewerProps {
  documentId: string;
  onClose: () => void;
}

export const SharedDocumentViewer: React.FC<SharedDocumentViewerProps> = ({ documentId, onClose }) => {
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const doc = getSharedDocument(documentId);
    if (doc) {
      // Verificar si no ha expirado
      if (new Date(doc.expiresAt) < new Date()) {
        setError('Este documento ha expirado');
      } else {
        setDocument(doc);
      }
    } else {
      setError('Documento no encontrado');
    }
    setLoading(false);
  }, [documentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando documento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md text-center">
          <i className="fa-solid fa-file-circle-xmark text-6xl text-red-500 mb-4"></i>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{error}</h1>
          <p className="text-slate-600 mb-6">El documento que buscas no está disponible.</p>
          
          <div className="border-t pt-6">
            <h2 className="text-lg font-bold text-slate-900 mb-3">¿Quieres gestionar tus proyectos?</h2>
            <p className="text-slate-600 mb-4">Descarga Worky App y lleva el control de tu negocio.</p>
            <a 
              href="https://worky.app/download" 
              className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition"
            >
              <i className="fa-solid fa-download mr-2"></i>
              Descargar Worky App
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { type, data, businessLogo, userProfile } = document;
  
  const getDocumentTitle = () => {
    switch (type) {
      case 'quote': return `Cotización #${data.number}`;
      case 'invoice': return `Factura #${data.number}`;
      case 'receipt': return `Recibo #${data.number}`;
      case 'collection_account': return `Cuenta de Cobro #${data.number}`;
      default: return 'Documento';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {businessLogo ? (
              <img src={businessLogo} alt="Logo" className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <i className="fa-solid fa-briefcase"></i>
              </div>
            )}
            <div>
              <h1 className="font-bold">{userProfile?.businessName || 'Worky'}</h1>
              <p className="text-sm text-white/80">{getDocumentTitle()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <i className="fa-solid fa-print"></i>
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Document Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 md:p-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold mb-2">{getDocumentTitle()}</h2>
                <p className="text-slate-300">
                  Fecha: {new Date(data.date).toLocaleDateString('es-CO', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              {businessLogo && (
                <img src={businessLogo} alt="Logo" className="w-20 h-20 rounded-xl object-contain bg-white p-2" />
              )}
            </div>
          </div>

          {/* Client Info */}
          <div className="p-6 md:p-8 border-b">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Cliente</h3>
            <p className="text-xl font-bold text-slate-900">{data.clientName}</p>
            {data.clientAddress && <p className="text-slate-600">{data.clientAddress}</p>}
            {data.clientPhone && <p className="text-slate-600">{data.clientPhone}</p>}
          </div>

          {/* Items */}
          {data.items && data.items.length > 0 && (
            <div className="p-6 md:p-8">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Detalle</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-3 px-2 font-bold text-slate-700">Descripción</th>
                      <th className="text-center py-3 px-2 font-bold text-slate-700">Cant.</th>
                      <th className="text-right py-3 px-2 font-bold text-slate-700">Precio</th>
                      <th className="text-right py-3 px-2 font-bold text-slate-700">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="py-3 px-2 text-slate-800">{item.description}</td>
                        <td className="py-3 px-2 text-center text-slate-600">{item.quantity}</td>
                        <td className="py-3 px-2 text-right text-slate-600">{formatCurrency(item.price)}</td>
                        <td className="py-3 px-2 text-right font-medium text-slate-800">{formatCurrency(item.quantity * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-slate-700">TOTAL</span>
              <span className="text-3xl font-bold text-indigo-600">{formatCurrency(data.total)}</span>
            </div>
          </div>

          {/* Business Info */}
          {userProfile && (
            <div className="p-6 md:p-8 bg-slate-50 border-t">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Información de Contacto</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-bold text-slate-800">{userProfile.businessName}</p>
                  <p className="text-slate-600">{userProfile.ownerName}</p>
                </div>
                <div className="text-slate-600">
                  {userProfile.phone && <p><i className="fa-solid fa-phone mr-2"></i>{userProfile.phone}</p>}
                  {userProfile.address && <p><i className="fa-solid fa-location-dot mr-2"></i>{userProfile.address}</p>}
                  {userProfile.city && <p>{userProfile.city}, {userProfile.country}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Download App CTA */}
        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 md:p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">¿Quieres gestionar tu negocio así?</h3>
          <p className="text-white/80 mb-6">Descarga Worky App y crea cotizaciones, facturas y más en segundos.</p>
          <a 
            href="https://worky.app/download" 
            className="inline-block bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold hover:bg-slate-100 transition shadow-lg"
          >
            <i className="fa-solid fa-download mr-2"></i>
            Descargar Worky App Gratis
          </a>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm pb-8">
          <p>Documento generado con <span className="font-bold text-indigo-600">Worky</span></p>
        </div>
      </div>
    </div>
  );
};
