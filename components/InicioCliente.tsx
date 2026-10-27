/**
 * El Inicio de quien compra: dos bloques y nada más.
 *
 * Quien escanea un QR y se queda no necesita una consola de vendedor. Antes veía
 * la misma pantalla de quien vende —«Subir mi primer producto», «Cotizar y
 * cobrar», «Gantt»— y no tenía por qué entender ninguna. Aquí:
 *
 * 1. **Tus conversaciones:** con quién ha hablado, lo último que se dijeron y,
 *    si le contestaron, un «Responder».
 * 2. **Tiendas que sigues:** las que guardó al escanear, con lo único que se hace
 *    con una tienda: verla o escribirle.
 *
 * Lo que recibe —una cotización, una cuenta de cobro— sigue donde ya estaba, en
 * el chat. No se inventa otra pantalla para eso.
 *
 * Reglas: una sola acción por tarjeta, nada de jerga («cuenta de cobro»,
 * «proyecto»), y nada vacío sin decir qué hacer.
 */
import React, { useMemo, useState } from 'react';
import { ChevronRight, Heart, MessageCircle, Store } from 'lucide-react';
import AvisoGuardarEspacio from './AvisoGuardarEspacio';
import { aMs, horaCorta } from '../utils/inicio';
import { fotoOIniciales } from '../utils/avatar';
import { leerTiendas } from '../utils/tiendasGuardadas';
import type { Contact } from '../types';

interface InicioClienteProps {
  contacts: Contact[];
  /** Cómo llamarle: su nombre si lo dio, o el alias con el que entró. */
  nombre: string;
  /** Sin cuenta todavía: se le ofrece guardar su espacio. */
  esAnonimo: boolean;
  onOpenChat: (contactId: string) => void;
  /**
   * Abre el chat con una tienda si ya es un contacto. Devuelve si pudo: quien
   * siguió una tienda antes de escribirle todavía no la tiene agregada, y
   * entonces hay que pasar por la invitación, que es la que crea el contacto.
   */
  onAbrirChatTienda: (tiendaId: string) => boolean;
  onGoogle: () => Promise<boolean>;
  onCorreo: () => void;
  errorInicial?: string;
}

const Titulo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2.5">{children}</h3>
);

const Vacio: React.FC<{ icono: React.ReactNode; texto: string }> = ({ icono, texto }) => (
  <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-5 flex items-start gap-3">
    <div className="w-10 h-10 rounded-xl bg-rey-50 text-rey-600 flex items-center justify-center shrink-0">{icono}</div>
    <p className="text-[13px] text-slate-600 leading-snug pt-0.5">{texto}</p>
  </div>
);

export const InicioCliente: React.FC<InicioClienteProps> = ({
  contacts, nombre, esAnonimo, onOpenChat, onAbrirChatTienda, onGoogle, onCorreo, errorInicial,
}) => {
  // Las de ahora primero, y las que esperan respuesta por encima de las demás.
  const conversaciones = useMemo(
    () => [...contacts].sort((a, b) =>
      ((b.unreadCount || 0) > 0 ? 1 : 0) - ((a.unreadCount || 0) > 0 ? 1 : 0)
      || aMs(b.lastMessageTime) - aMs(a.lastMessageTime)),
    [contacts],
  );
  const [tiendas] = useState(() => leerTiendas());

  const verCatalogo = (id: string) => { window.location.href = `/?catalogo=${encodeURIComponent(id)}`; };
  const escribir = (id: string) => {
    if (!onAbrirChatTienda(id)) window.location.href = `/?vendedor=${encodeURIComponent(id)}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <p className="text-lg font-bold text-slate-900">Hola, {nombre}</p>

      {/* Guardar el espacio: solo si hay algo que perder. */}
      {esAnonimo && (
        <div className="rounded-2xl overflow-hidden border border-rey-200">
          <AvisoGuardarEspacio onGoogle={onGoogle} onCorreo={onCorreo} errorInicial={errorInicial} />
        </div>
      )}

      {/* 1. CONVERSACIONES */}
      <section>
        <Titulo>Tus conversaciones</Titulo>
        {conversaciones.length === 0 ? (
          <Vacio
            icono={<MessageCircle size={20} strokeWidth={1.75} />}
            texto="Aún no has escrito a ninguna tienda. Escanea el código QR de una tienda y pregúntale lo que quieras desde su catálogo."
          />
        ) : (
          <div className="space-y-2">
            {conversaciones.slice(0, 6).map(c => {
              const sinLeer = (c.unreadCount || 0) > 0;
              return (
                <button
                  key={c.id} type="button" onClick={() => onOpenChat(c.id)}
                  className={`w-full bg-white rounded-2xl p-3 border shadow-sm flex items-center gap-3 text-left hover:shadow-md transition ${sinLeer ? 'border-rey-300' : 'border-slate-200'}`}
                >
                  <div className="relative shrink-0">
                    <img src={fotoOIniciales(c.avatar, c.clientName)} alt="" className="w-11 h-11 rounded-full object-cover" />
                    {sinLeer && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                        {c.unreadCount > 99 ? '99+' : c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">{c.clientName}</span>
                      <span className="text-[11px] text-slate-400 shrink-0">{horaCorta(c.lastMessageTime)}</span>
                    </div>
                    <p className={`text-[12.5px] truncate ${sinLeer ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
                      {c.lastMessage || 'Toca para escribir'}
                    </p>
                  </div>
                  {sinLeer
                    ? <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[12px] font-bold shrink-0">Responder</span>
                    : <ChevronRight size={16} strokeWidth={1.75} className="text-slate-300 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. TIENDAS QUE SIGUES */}
      <section>
        <Titulo>Tiendas que sigues</Titulo>
        {tiendas.length === 0 ? (
          <Vacio
            icono={<Heart size={20} strokeWidth={1.75} />}
            texto="Cuando sigas una tienda con el corazón de su catálogo, aparecerá aquí para que vuelvas a verla cuando quieras."
          />
        ) : (
          <div className="space-y-2">
            {tiendas.map(t => (
              <div key={t.id} className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <img src={fotoOIniciales(t.logo, t.negocio)} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{t.negocio}</p>
                    {(t.ubicacion || t.ciudad) && (
                      <p className="text-[12px] text-slate-500 truncate">{t.ubicacion || t.ciudad}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    type="button" onClick={() => verCatalogo(t.id)}
                    className="py-2 rounded-xl bg-rey-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 hover:bg-rey-700 transition"
                  >
                    <Store size={16} strokeWidth={1.75} /> Ver catálogo
                  </button>
                  <button
                    type="button" onClick={() => escribir(t.id)}
                    className="py-2 rounded-xl bg-white border border-rey-300 text-rey-700 text-[13px] font-bold flex items-center justify-center gap-1.5 hover:bg-rey-50 transition"
                  >
                    <MessageCircle size={16} strokeWidth={1.75} /> Escribir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default InicioCliente;
