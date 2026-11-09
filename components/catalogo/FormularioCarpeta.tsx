/**
 * Crear o cambiar una carpeta.
 *
 * Crear pide una sola cosa: el nombre. La foto de portada es opcional y queda
 * detrás de un botón, y «mover a otra carpeta» solo aparece al editar. Antes el
 * formulario llevaba siempre «Dentro de (Opcional)», un desplegable, y «Portada
 * (Opcional)» con una caja grande: dos preguntas que casi nadie necesita para
 * ponerle nombre a una carpeta.
 */
import React from 'react';

interface Props {
  /** «Nueva carpeta», «Nueva carpeta dentro de «Jean»», «Cambiar nombre o foto». */
  titulo: string;
  nombre: string;
  onNombre: (nombre: string) => void;
  onGuardar: () => void;
  onCancelar: () => void;
  textoGuardar: 'Crear' | 'Guardar';
  portada: string;
  onPortada: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onQuitarPortada: () => void;
  /** Solo al editar una carpeta que puede cambiar de lugar. */
  mover?: {
    valor: string;
    onCambiar: (id: string) => void;
    opciones: Array<{ id: string; nombre: string }>;
  };
}

const CAMPO = 'w-full bg-white p-3 text-base rounded-lg border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none';

export const FormularioCarpeta: React.FC<Props> = ({
  titulo, nombre, onNombre, onGuardar, onCancelar, textoGuardar, portada, onPortada, onQuitarPortada, mover,
}) => (
  <div className="mb-5 p-4 bg-purple-50/60 rounded-xl border border-purple-200">
    <h4 className="font-bold text-slate-800 text-base mb-3">{titulo}</h4>

    <input
      type="text"
      value={nombre}
      onChange={e => onNombre(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && nombre.trim()) onGuardar(); }}
      placeholder="Escribe el nombre"
      aria-label="Nombre de la carpeta"
      autoFocus
      className={CAMPO}
    />

    <div className="mt-3 flex items-center gap-3 flex-wrap">
      <input type="file" accept="image/*" onChange={onPortada} className="hidden" id="portada-de-carpeta" />
      <label
        htmlFor="portada-de-carpeta"
        className="cursor-pointer text-sm font-semibold text-purple-700 bg-white border border-purple-200 rounded-lg px-3 py-2 hover:bg-purple-50"
      >
        <i className="fa-solid fa-image mr-2"></i>
        {portada ? 'Cambiar la foto' : 'Añadir una foto (opcional)'}
      </label>
      {portada && (
        <span className="flex items-center gap-2">
          <img src={portada} alt="Foto de la carpeta" className="w-14 h-14 object-cover rounded-lg border-2 border-purple-300" />
          <button type="button" onClick={onQuitarPortada} className="text-sm font-semibold text-rose-600 underline">
            Quitar
          </button>
        </span>
      )}
    </div>

    {mover && (
      <div className="mt-3">
        <label className="block text-sm font-semibold text-slate-700 mb-1">Mover a otra carpeta</label>
        <select value={mover.valor} onChange={e => mover.onCambiar(e.target.value)} className={CAMPO}>
          <option value="">No, que sea una carpeta principal</option>
          {mover.opciones.map(o => (
            <option key={o.id} value={o.id}>Dentro de «{o.nombre}»</option>
          ))}
        </select>
      </div>
    )}

    <div className="mt-4 flex gap-2">
      <button
        type="button"
        onClick={onGuardar}
        disabled={!nombre.trim()}
        className="flex-1 bg-purple-600 text-white py-3 rounded-lg text-base font-bold hover:bg-purple-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <i className="fa-solid fa-check mr-2"></i>
        {textoGuardar}
      </button>
      <button
        type="button"
        onClick={onCancelar}
        className="px-5 py-3 rounded-lg text-base font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
      >
        Cancelar
      </button>
    </div>
  </div>
);
