/**
 * Foto a pantalla completa, para mirar los detalles de lo que se cotiza.
 *
 * En el documento las fotos son miniaturas de 80 píxeles: sirven para saber de
 * qué ítem son, no para decidir. Este visor es lo que el cliente abre cuando
 * quiere ver el acabado de cerca.
 *
 * Se pinta en el body y no dentro del documento: la hoja se reduce con `zoom`
 * para caber en pantallas estrechas, y una capa dentro de ella se reduciría
 * también. Tampoco se imprime: es solo para mirar.
 */
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface VisorDeFotosProps {
  fotos: string[];
  indice: number;
  onCambiar: (indice: number) => void;
  onCerrar: () => void;
}

export const VisorDeFotos: React.FC<VisorDeFotosProps> = ({ fotos, indice, onCambiar, onCerrar }) => {
  const total = fotos.length;
  const anterior = () => onCambiar((indice - 1 + total) % total);
  const siguiente = () => onCambiar((indice + 1) % total);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      else if (total > 1 && e.key === 'ArrowLeft') anterior();
      else if (total > 1 && e.key === 'ArrowRight') siguiente();
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  });

  if (!total) return null;

  const flecha = 'absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 transition flex items-center justify-center';

  return createPortal(
    <div
      className="no-print fixed inset-0 z-[300] bg-black/90 flex items-center justify-center animate-fade-in"
      onClick={onCerrar}
      role="dialog"
      aria-label="Foto ampliada"
    >
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute top-3 right-3 w-11 h-11 rounded-full bg-black/50 text-white hover:bg-black/70 transition flex items-center justify-center"
      >
        <i className="fa-solid fa-xmark text-lg"></i>
      </button>

      <img
        src={fotos[indice]}
        alt=""
        onClick={e => e.stopPropagation()}
        className="max-w-full max-h-full object-contain select-none"
      />

      {total > 1 && (
        <>
          <button type="button" aria-label="Foto anterior" onClick={e => { e.stopPropagation(); anterior(); }} className={`${flecha} left-3`}>
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button type="button" aria-label="Foto siguiente" onClick={e => { e.stopPropagation(); siguiente(); }} className={`${flecha} right-3`}>
            <i className="fa-solid fa-chevron-right"></i>
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-bold">
            {indice + 1} / {total}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
};
