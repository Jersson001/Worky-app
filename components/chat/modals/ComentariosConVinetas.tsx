import React, { useLayoutEffect, useRef, useState } from 'react';

interface ComentariosConVinetasProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const VINETA = '• ';

/**
 * Caja de comentarios donde Enter siempre baja de línea y un botón enciende la
 * viñeta: al encenderla es como dar un Enter que abre «• », y mientras siga
 * encendida cada Enter abre otra. Enter sobre una viñeta vacía la cierra.
 */
export const ComentariosConVinetas: React.FC<ComentariosConVinetasProps> = ({
  value, onChange, placeholder, rows = 2, className = '',
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [activa, setActiva] = useState(false);
  const cursorPendiente = useRef<number | null>(null);

  // La caja crece con el texto: `rows` es el mínimo, y nunca queda una barra
  // de desplazamiento escondiendo líneas del comentario.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (cursorPendiente.current !== null) {
      el.setSelectionRange(cursorPendiente.current, cursorPendiente.current);
      cursorPendiente.current = null;
    }
  }, [value]);

  const insertar = (texto: string, desde: number, hasta: number) => {
    onChange(value.slice(0, desde) + texto + value.slice(hasta));
    cursorPendiente.current = desde + texto.length;
  };

  const inicioDeLinea = (pos: number) => value.lastIndexOf('\n', pos - 1) + 1;

  const alternar = () => {
    const el = ref.current;
    if (activa) {
      setActiva(false);
      el?.focus();
      return;
    }
    setActiva(true);
    const pos = el ? el.selectionStart : value.length;
    const finActual = value.slice(inicioDeLinea(pos), pos);
    // En una línea vacía la viñeta va ahí mismo; si hay texto, es como un Enter.
    insertar(finActual === '' ? VINETA : `\n${VINETA}`, pos, el ? el.selectionEnd : pos);
    el?.focus();
  };

  const alTeclear = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activa || e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    const { selectionStart: desde, selectionEnd: hasta } = e.currentTarget;
    const inicio = inicioDeLinea(desde);
    if (value.slice(inicio, desde) === VINETA && desde === hasta) {
      onChange(value.slice(0, inicio) + value.slice(desde));
      cursorPendiente.current = inicio;
      setActiva(false);
      return;
    }
    insertar(`\n${VINETA}`, desde, hasta);
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={alTeclear}
        placeholder={placeholder}
        rows={rows}
        className={`${className} pr-9 overflow-hidden`}
      />
      <button
        type="button"
        onMouseDown={e => e.preventDefault()}
        onClick={alternar}
        title={activa ? 'Quitar viñetas' : 'Agregar viñeta'}
        aria-pressed={activa}
        className={`absolute bottom-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold transition ${
          activa ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
        }`}
      >
        <i className="fa-solid fa-list-ul text-[11px]"></i>
      </button>
    </div>
  );
};

export default ComentariosConVinetas;
