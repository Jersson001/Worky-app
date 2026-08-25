/**
 * QR de presentación del catálogo.
 *
 * Al abrirse publica la instantánea del catálogo y muestra el QR de su URL.
 * La URL es estable por usuario, así que el QR impreso sigue funcionando
 * después de actualizar productos: basta con volver a publicar.
 */
import React, { useEffect, useState } from 'react';
import { Product, UserProfileData } from '../types';
import { getCurrentUserId } from '../services/messagingService';
import { describeError } from '../utils/errorMessage';
import { publishCatalog, qrImageUrl } from '../services/catalogShareService';

interface CatalogShareModalProps {
  show: boolean;
  onClose: () => void;
  profile: UserProfileData | null;
  products: Product[];
}

export const CatalogShareModal: React.FC<CatalogShareModalProps> = ({
  show, onClose, profile, products,
}) => {
  const [estado, setEstado] = useState<'publicando' | 'listo' | 'error'>('publicando');
  const [enlace, setEnlace] = useState('');
  const [detalle, setDetalle] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!show) return;
    let vigente = true;

    setEstado('publicando');
    // El id vive en el módulo de mensajería; aquí siempre hay sesión, pero
    // getCurrentUserId lanza si no la hubiera.
    let userId: string;
    try {
      userId = getCurrentUserId();
    } catch (e) {
      setDetalle(describeError(e));
      setEstado('error');
      return;
    }

    publishCatalog(userId, profile ?? { businessName: '', ownerName: '', phone: '' } as any, products)
      .then(publicada => {
        if (!vigente) return;
        setEnlace(publicada);
        setEstado('listo');
      })
      .catch(e => {
        if (!vigente) return;
        console.error('Error publicando el catálogo:', e);
        setDetalle(describeError(e));
        setEstado('error');
      });

    return () => { vigente = false; };
  }, [show, products, profile]);

  if (!show) return null;

  const negocio = profile?.businessName || profile?.ownerName || 'Mi catálogo';

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles: el enlace está visible para copiarlo a mano */
    }
  };

  const porWhatsApp = () => {
    const texto = `¡Mira nuestro catálogo!\n\n*${negocio}*\n${enlace}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <i className="fa-solid fa-qrcode text-white"></i>
          </div>
          <h2 className="flex-1 text-white font-bold">Compartir catálogo</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar">
          {estado === 'publicando' && (
            <div className="py-14 text-center text-slate-500">
              <i className="fa-solid fa-circle-notch fa-spin text-2xl text-purple-500 mb-3 block"></i>
              <p className="text-sm font-semibold">Publicando tu catálogo…</p>
              <p className="text-xs text-slate-400 mt-1">Preparando {products.length} producto{products.length === 1 ? '' : 's'}</p>
            </div>
          )}

          {estado === 'error' && (
            <div className="py-12 text-center">
              <i className="fa-solid fa-triangle-exclamation text-2xl text-amber-500 mb-3 block"></i>
              <p className="text-sm font-semibold text-slate-700">No se pudo publicar el catálogo</p>
              {detalle && (
                <p className="text-xs text-slate-500 mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-left break-words">
                  {detalle}
                </p>
              )}
            </div>
          )}

          {estado === 'listo' && (
            <>
              <div className="text-center mb-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Catálogo de</p>
                <p className="font-bold text-slate-900">{negocio}</p>
              </div>

              <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 flex justify-center mb-4">
                <img src={qrImageUrl(enlace, 300)} alt="QR del catálogo" className="w-52 h-52" />
              </div>

              <p className="text-xs text-center text-slate-500 mb-4">
                Quien lo escanee ve tu catálogo <strong>sin registrarse</strong>.
                Solo necesita una cuenta si quiere escribirte.
              </p>

              <button
                onClick={copiar}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2 text-left hover:bg-slate-100 transition"
              >
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">
                  {copiado ? '¡Enlace copiado!' : 'Enlace — toca para copiar'}
                </span>
                <span className="text-xs text-slate-700 break-all">{enlace}</span>
              </button>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={porWhatsApp}
                  className="flex-1 bg-green-500 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-600 transition flex items-center justify-center gap-2"
                >
                  <i className="fa-brands fa-whatsapp"></i> Enviar
                </button>
                <a
                  href={qrImageUrl(enlace, 600)}
                  target="_blank"
                  rel="noopener"
                  className="flex-1 bg-slate-800 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-slate-900 transition flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-print"></i> Imprimir
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogShareModal;
