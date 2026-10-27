/**
 * El directorio: todos los contactos, por orden alfabético.
 *
 * La lista de Chats es para contestar —lo último arriba— y no sirve para
 * encontrar a alguien por su nombre ni, sobre todo, por su teléfono o su correo.
 * Aquí se busca por todo eso, se filtra entre clientes y proveedores, y cada
 * fila enseña cómo localizar a la persona, con su botón para escribirle por
 * WhatsApp o llamarle sin abrir el chat.
 *
 * Es lo de la app: no lee la agenda del teléfono. Elegir un contacto de la
 * agenda al crear uno nuevo es otra cosa, que pide la app de Android.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Phone, Search, UserPlus, Users, X } from 'lucide-react';
import { fotoOIniciales } from '../utils/avatar';
import {
  agruparPorLetra, contarPorRol, filtrarContactos, medioDeContacto, numeroParaWhatsApp,
  FiltroDeRol,
} from '../utils/directorio';
import type { Contact } from '../types';

interface DirectorioContactosProps {
  contacts: Contact[];
  onClose: () => void;
  onOpenChat: (contactId: string) => void;
  onNewContact: () => void;
}

const ETIQUETA_ROL: Record<string, string> = {
  client: 'Cliente',
  supplier: 'Proveedor',
  collaborator: 'Colaborador',
};

const COLOR_ROL: Record<string, string> = {
  client: 'bg-rey-50 text-rey-700',
  supplier: 'bg-amber-50 text-amber-700',
  collaborator: 'bg-violet-50 text-violet-700',
};

export const DirectorioContactos: React.FC<DirectorioContactosProps> = ({
  contacts, onClose, onOpenChat, onNewContact,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [rol, setRol] = useState<FiltroDeRol>('todos');

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onClose]);

  const cuenta = useMemo(() => contarPorRol(contacts), [contacts]);
  const grupos = useMemo(
    () => agruparPorLetra(filtrarContactos(contacts, rol, busqueda)),
    [contacts, rol, busqueda],
  );
  const encontrados = grupos.reduce((n, g) => n + g.contactos.length, 0);

  // Solo se ofrecen los roles que existen: un filtro con 0 es un callejón.
  const filtros: { clave: FiltroDeRol; etiqueta: string }[] = [
    { clave: 'todos', etiqueta: 'Todos' },
    ...(cuenta.client > 0 ? [{ clave: 'client' as const, etiqueta: 'Clientes' }] : []),
    ...(cuenta.supplier > 0 ? [{ clave: 'supplier' as const, etiqueta: 'Proveedores' }] : []),
    ...(cuenta.collaborator > 0 ? [{ clave: 'collaborator' as const, etiqueta: 'Colaboradores' }] : []),
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-slate-900/50" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label="Contactos"
        className="bg-white w-full max-w-lg h-[92vh] md:h-[80vh] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rey-50 text-rey-600 flex items-center justify-center shrink-0">
                <Users size={21} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Contactos</h2>
                <p className="text-[12px] text-slate-500">
                  {cuenta.todos} {cuenta.todos === 1 ? 'contacto' : 'contactos'}
                </p>
              </div>
            </div>
            <button
              type="button" onClick={onClose} aria-label="Cerrar"
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center shrink-0"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>

          <div className="relative mt-3.5">
            <Search size={17} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Nombre, teléfono, correo o documento"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-rey-500 focus:bg-white transition"
            />
          </div>

          {filtros.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {filtros.map(f => (
                <button
                  key={f.clave} type="button" onClick={() => setRol(f.clave)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold border whitespace-nowrap transition ${
                    rol === f.clave
                      ? 'bg-rey-600 text-white border-rey-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-rey-300'
                  }`}
                >
                  {f.etiqueta} <span className={rol === f.clave ? 'text-white/80' : 'text-slate-400'}>{cuenta[f.clave]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {encontrados === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-semibold text-slate-700">
                {contacts.length === 0 ? 'Aún no tienes contactos' : 'No encontramos a nadie con eso'}
              </p>
              <p className="text-[13px] text-slate-500 mt-1">
                {contacts.length === 0
                  ? 'Agrega a tu primer cliente o proveedor para empezar.'
                  : 'Prueba con otra parte del nombre, o con el teléfono.'}
              </p>
            </div>
          ) : (
            grupos.map(g => (
              <section key={g.letra}>
                <div className="sticky top-0 z-10 bg-slate-50 px-5 py-1.5 text-[11px] font-extrabold text-slate-500 tracking-wider border-y border-slate-100">
                  {g.letra}
                </div>
                {g.contactos.map(c => {
                  const medio = medioDeContacto(c);
                  const wa = numeroParaWhatsApp(c.phone);
                  const llamar = (c.phone || '').replace(/[^\d+]/g, '');
                  const puedeLlamar = !!llamar && !/[a-z@]/i.test(c.phone) && llamar.replace(/\D/g, '').length >= 7;
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                      <button
                        type="button" onClick={() => onOpenChat(c.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <img src={fotoOIniciales(c.avatar, c.clientName)} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[14.5px] font-semibold text-slate-900 truncate">{c.clientName}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${COLOR_ROL[c.role] || 'bg-slate-100 text-slate-500'}`}>
                              {ETIQUETA_ROL[c.role] || c.role}
                            </span>
                          </div>
                          <p className="text-[12.5px] text-slate-500 truncate">{medio || 'Sin teléfono ni correo'}</p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {wa && (
                          <a
                            href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                            aria-label={`Escribir a ${c.clientName} por WhatsApp`} title="WhatsApp"
                            className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition"
                          >
                            <i className="fa-brands fa-whatsapp text-[17px]"></i>
                          </a>
                        )}
                        {puedeLlamar && (
                          <a
                            href={`tel:${llamar}`}
                            aria-label={`Llamar a ${c.clientName}`} title="Llamar"
                            className="w-9 h-9 rounded-full bg-rey-50 text-rey-600 hover:bg-rey-100 flex items-center justify-center transition"
                          >
                            <Phone size={17} strokeWidth={1.75} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))
          )}
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-slate-100">
          <button
            type="button" onClick={onNewContact}
            className="w-full py-3 rounded-xl bg-rey-600 hover:bg-rey-700 text-white font-bold text-[14px] flex items-center justify-center gap-2 transition shadow-md shadow-rey-600/25"
          >
            <UserPlus size={18} strokeWidth={1.75} /> Nuevo contacto
          </button>
        </div>
      </div>
    </div>
  );
};

export default DirectorioContactos;
