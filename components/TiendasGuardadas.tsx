import React, { useState } from 'react';
import { leerTiendas, quitarTienda, TiendaGuardada } from '../utils/tiendasGuardadas';
import { fotoOIniciales } from '../utils/avatar';

interface TiendasGuardadasProps {
  onClose: () => void;
  /**
   * Abre el chat con esa tienda si ya es un contacto.
   *
   * Devuelve si pudo: quien guardó la tienda antes de registrarse todavía no
   * la tiene agregada, y entonces hay que pasar por la invitación, que es lo
   * que crea el contacto.
   */
  onAbrirChat: (idTienda: string) => boolean;
}

/**
 * La agenda de tiendas: las que guardó al escanear sus QR.
 *
 * Es la otra mitad del botón «Guardar» del catálogo. Sin esto, lo guardado solo
 * se podía volver a ver desde el catálogo de esa misma tienda —o sea, desde
 * donde ya estabas—, que no es de mucha ayuda para volver una semana después.
 *
 * Se leen del teléfono, no de la cuenta: se guardan antes de tener cuenta. Por
 * eso el aviso del pie, que no es un adorno: es lo único que le dice a alguien
 * que esta lista no le sigue si cambia de aparato.
 */
export const TiendasGuardadas: React.FC<TiendasGuardadasProps> = ({ onClose, onAbrirChat }) => {
  const [tiendas, setTiendas] = useState<TiendaGuardada[]>(() => leerTiendas());

  const quitar = (t: TiendaGuardada) => {
    quitarTienda(t.id);
    setTiendas(leerTiendas());
  };

  const abrirCatalogo = (t: TiendaGuardada) => {
    window.location.href = `/?catalogo=${encodeURIComponent(t.id)}`;
  };

  const chatear = (t: TiendaGuardada) => {
    // Si ya es un contacto se abre su chat sin recargar; si no, la invitación
    // se encarga de crearlo y de dejarle ahí mismo.
    if (onAbrirChat(t.id)) onClose();
    else window.location.href = `/?vendedor=${encodeURIComponent(t.id)}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex justify-center items-start pt-10 px-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30 flex-shrink-0">
              <i className="fa-solid fa-bookmark"></i>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Tiendas guardadas</h2>
              <p className="text-slate-500 text-[13px]">Las que guardaste al escanear su código</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition bg-slate-100 hover:bg-slate-200 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-2">
          {tiendas.length === 0 ? (
            <div className="text-center py-10 px-4">
              <i className="fa-regular fa-bookmark text-3xl text-slate-300 mb-3 block"></i>
              <p className="text-slate-600 font-semibold mb-1">Todavía no has guardado ninguna tienda</p>
              <p className="text-slate-500 text-sm">
                Cuando escanees el código de una tienda, toca <b>🔖 Guardar</b> en su catálogo y
                la encontrarás aquí.
              </p>
            </div>
          ) : (
            tiendas.map(t => (
              <div key={t.id} className="border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <img
                  src={fotoOIniciales(t.logo, t.negocio)}
                  alt=""
                  className="w-11 h-11 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 text-sm truncate">{t.negocio}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {[t.ubicacion, t.ciudad].filter(Boolean).join(' · ') || 'Sin dirección'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => abrirCatalogo(t)}
                    title="Ver su catálogo"
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                  >
                    <i className="fa-solid fa-box-open"></i>
                  </button>
                  <button
                    onClick={() => chatear(t)}
                    title="Escribirle"
                    className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                  >
                    <i className="fa-solid fa-comment-dots"></i>
                  </button>
                  <button
                    onClick={() => quitar(t)}
                    title="Quitar de mis tiendas"
                    className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {tiendas.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-[11px] text-slate-500">
              Guardadas en este teléfono. Si cambias de teléfono o borras los datos del
              navegador, esta lista se pierde.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
