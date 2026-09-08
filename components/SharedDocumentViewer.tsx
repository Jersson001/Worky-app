/**
 * Lo que ve el cliente al abrir el enlace de un documento.
 *
 * Antes pintaba aquí su propia maqueta del documento, distinta de la que ve y
 * imprime quien lo manda. Dos maquetas para lo mismo significa hacer cada
 * mejora dos veces, y cuando se olvida una, se nota: las fotos de las líneas
 * llevaban meses en el documento de verdad y aquí no salían, así que el cliente
 * aprobaba un precio sin ver lo que estaba comprando.
 *
 * Ahora esto no maqueta nada: carga el documento guardado y se lo da a
 * `DocumentViewer`, el mismo que usa el vendedor. El JSON que se sube trae
 * justo lo que ese componente necesita —tipo, datos, logo, firma y perfil—, así
 * que no hay nada que adaptar. Lo de aquí es lo que rodea al documento: los
 * botones para responder, el catálogo y el pie.
 */
import React, { useEffect, useState } from 'react';
import { getSharedDocument, WORKY_PLAY_STORE_URL } from '../services/whatsappService';
import { chatInviteUrl } from '../services/catalogShareService';
import { DocumentViewer } from './QuoteDocument';

interface SharedDocumentViewerProps {
  documentId: string;
  onClose: () => void;
}

export const SharedDocumentViewer: React.FC<SharedDocumentViewerProps> = ({ documentId, onClose }) => {
  const [documento, setDocumento] = useState<any>(null);
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
            setDocumento(doc);
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

  const { type, data, businessLogo, userProfile, digitalSignature } = documento;
  const enlaceAlChat = documento?.vendedorId
    ? chatInviteUrl(documento.vendedorId, documento.documentId || documentId)
    : null;

  return (
    <DocumentViewer
      type={type}
      data={data}
      businessLogo={businessLogo}
      digitalSignature={digitalSignature}
      userProfile={userProfile}
      // El QR del documento lleva al catálogo de su vendedor. Aquí no hay
      // sesión de la que deducirlo, pero el documento lo trae guardado.
      catalogoUrl={documento.catalogoUrl}
      // Lo abre el cliente: sin mover la firma ajena y sin volver a compartir.
      soloLectura
      // El documento ES la página: no hay chat al que volver.
      onClose={undefined}
      acciones={enlaceAlChat ? (
        <a
          href={enlaceAlChat}
          className="bg-[#00a884] text-[#111b21] px-5 py-2 rounded-full font-bold shadow-lg hover:bg-[#00c298] transition flex items-center gap-2"
        >
          <i className="fa-solid fa-comments"></i>
          <span className="hidden sm:inline">Responder</span>
        </a>
      ) : null}
      pie={
        <div className="space-y-4">
          {/* Responder.
              Lo primero al terminar de leer, y con diferencia lo más importante
              de este pie: una clienta recibió una cotización de verdad y se
              quedó sin saber cómo contestar, porque aquí abajo solo había
              publicidad de Worky. Lleva al mismo sitio que el QR del catálogo
              —se entra con un alias, sin registrarse— y con el documento a
              cuestas, para que el chat no se abra en blanco justo después. */}
          {enlaceAlChat && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 text-center shadow-lg">
              <h3 className="text-xl font-extrabold text-slate-900 mb-1.5">¿Tienes dudas o quieres aceptar?</h3>
              <p className="text-slate-600 text-sm mb-5">
                Respóndele directo por el chat. No necesitas registrarte.
              </p>
              <a
                href={enlaceAlChat}
                className="inline-flex items-center justify-center gap-3 w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-extrabold text-base hover:bg-blue-700 transition shadow-lg shadow-blue-500/25 active:scale-[0.99]"
              >
                <i className="fa-solid fa-comments text-lg"></i>
                <span>Responder por el chat</span>
              </a>
            </div>
          )}

          {/* El catálogo, después de lo suyo. Se le ofrece cuando ya vio el
              precio, no compitiendo con él, y solo si de verdad hay catálogo. */}
          {documento?.catalogoUrl && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-lg">
              <h3 className="text-base font-extrabold text-slate-900 mb-1">Conoce todo nuestro catálogo</h3>
              <p className="text-slate-500 text-sm mb-4">
                Mira todo lo que hacemos. Tampoco necesitas registrarte.
              </p>
              <a
                href={documento.catalogoUrl}
                className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto bg-slate-50 text-slate-700 px-7 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-100 transition border border-slate-300"
              >
                <i className="fa-solid fa-store text-slate-500"></i>
                <span>Ver catálogo</span>
              </a>
            </div>
          )}

          {/* Worky, al pie y sin gritar: es publicidad nuestra dentro del
              documento comercial de otro. Va después de lo suyo y en pequeño. */}
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-lg">
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-slate-700">Documento hecho con Worky</p>
              <p className="text-xs text-slate-400 mt-0.5">Cotiza y cobra desde el celular</p>
            </div>
            <a
              href={WORKY_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition whitespace-nowrap border border-slate-200"
            >
              <i className="fa-brands fa-google-play text-blue-600"></i>
              Descargar
            </a>
          </div>
        </div>
      }
    />
  );
};
