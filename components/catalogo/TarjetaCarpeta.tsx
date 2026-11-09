/**
 * La tarjeta de una carpeta en el gestor del catálogo: foto, nombre y cuántos
 * productos tiene. Nada más.
 *
 * Antes llevaba encima tres botones redondos sin texto —añadir, editar y
 * borrar—, pegados entre sí: había que adivinar cuál era cuál, y el de borrar
 * quedaba al lado del de editar. Ahora toda la tarjeta es un solo botón que
 * abre la carpeta; editar y borrar viven dentro, con su nombre escrito.
 */
import React from 'react';

interface Props {
  nombre: string;
  /** Foto de portada, si la carpeta tiene. */
  portada?: string;
  /** Fotos de sus productos, para armar la portada cuando no hay una. */
  fotos: string[];
  icono?: string;
  /** Color de la carpeta, en hexadecimal, para el fondo del pie. */
  color?: string;
  productos: number;
  /** Cuántas carpetas hay dentro de esta. */
  dentro?: number;
  onAbrir: () => void;
}

export const TarjetaCarpeta: React.FC<Props> = ({ nombre, portada, fotos, icono = 'fa-box', color, productos, dentro = 0, onAbrir }) => (
  <button
    type="button"
    onClick={onAbrir}
    className="text-left bg-white rounded-xl border-2 border-slate-200 overflow-hidden hover:shadow-lg hover:border-purple-300 active:scale-[0.98] transition focus:outline-none focus:ring-4 focus:ring-purple-200"
  >
    <div className="aspect-square bg-slate-100 overflow-hidden">
      {portada ? (
        <img src={portada} alt="" className="w-full h-full object-cover" />
      ) : fotos.length > 0 ? (
        <div className="w-full h-full grid grid-cols-2 gap-0.5 p-0.5">
          {fotos.slice(0, 4).map((foto, i) => (
            <div key={i} className="bg-slate-200 rounded overflow-hidden">
              <img src={foto} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - fotos.length) }).map((_, i) => (
            <div key={`vacio-${i}`} className="bg-slate-100 rounded"></div>
          ))}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-slate-400">
          <i className={`fa-solid ${icono.replace(/^fa-solid\s+/, '')} text-5xl`}></i>
        </div>
      )}
    </div>
    <div className="p-3" style={color ? { backgroundColor: `${color}15` } : undefined}>
      <p className="font-bold text-slate-800 text-base leading-tight break-words">{nombre}</p>
      <p className="text-sm text-slate-600 mt-1">
        {productos === 0 ? 'Sin productos' : `${productos} ${productos === 1 ? 'producto' : 'productos'}`}
        {dentro > 0 && ` · ${dentro} ${dentro === 1 ? 'carpeta dentro' : 'carpetas dentro'}`}
      </p>
    </div>
  </button>
);
