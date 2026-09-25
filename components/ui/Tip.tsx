import React from 'react';

/** Tooltip flotante con flechita, activado con group-hover del padre.
 *  El padre necesita tener las clases `relative group`. */
const Tip: React.FC<{ text: string }> = ({ text }) => (
  <div className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
    <div className="bg-slate-800 text-white text-[10px] font-medium rounded-lg px-2.5 py-1.5 shadow-lg leading-tight text-center max-w-[130px]">
      {text}
    </div>
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800" />
  </div>
);

export default Tip;
