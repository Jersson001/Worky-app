/**
 * Las novedades de las tiendas que sigues: sus descuentos, sus productos nuevos.
 *
 * Es la otra mitad de la notificación. La notificación solo llega a quien tiene
 * Worky instalado; aquí lo ve cualquiera que abra la app o la web, y sirve
 * también para volver a un aviso que se pasó por alto.
 *
 * Si no sigue ninguna tienda no se pinta: ya lo explica «Tiendas que sigues».
 */
import React, { useEffect, useRef, useState } from 'react';
import { Store } from 'lucide-react';
import { fotoOIniciales } from '../utils/avatar';
import { emojiDeTipo, haceCuanto, textoDeVigencia } from '../utils/avisos';
import { marcarAvisosVistos, misAvisos, ultimaVistaDeAvisos, type Aviso } from '../services/avisosService';

interface Props {
  /** Si sigue alguna tienda. Sin eso no hay novedades que esperar. */
  sigueTiendas: boolean;
  /** El logo de cada tienda que se tenga a mano, por id. */
  logos?: Record<string, string | undefined>;
  onVerTienda: (tiendaId: string) => void;
}

export const NovedadesDeTiendas: React.FC<Props> = ({ sigueTiendas, logos = {}, onVerTienda }) => {
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  // Lo que ya estaba visto ANTES de abrir esto: así los nuevos se distinguen aunque
  // al abrirse se marque todo como visto.
  const vistoAntes = useRef<string | null>(ultimaVistaDeAvisos());

  useEffect(() => {
    if (!sigueTiendas) return;
    let vigente = true;
    misAvisos(10).then(a => {
      if (!vigente) return;
      setAvisos(a);
      if (a.length > 0) marcarAvisosVistos();
    });
    return () => { vigente = false; };
  }, [sigueTiendas]);

  if (!sigueTiendas || avisos === null) return null;

  const esNuevo = (a: Aviso) => !vistoAntes.current || new Date(a.creado) > new Date(vistoAntes.current);

  return (
    <section>
      <h3 className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2.5">Novedades de tus tiendas</h3>
      {avisos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-4">
          <p className="text-[13px] text-slate-600 leading-snug">
            Cuando una tienda que sigues publique un descuento o un producto nuevo, lo verás aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {avisos.slice(0, 5).map(a => {
            const vigencia = textoDeVigencia(a.venceEn);
            return (
              <div key={a.id} className={`bg-white rounded-2xl p-3.5 border shadow-sm ${esNuevo(a) ? 'border-rey-300' : 'border-slate-200'}`}>
                <div className="flex items-start gap-3">
                  <img src={fotoOIniciales(logos[a.tiendaId], a.negocio)} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-slate-500 truncate">
                      {a.negocio} · {haceCuanto(a.creado)}
                      {esNuevo(a) && <span className="ml-2 px-1.5 py-0.5 rounded-full bg-rey-600 text-white text-[10px] font-bold align-middle">Nuevo</span>}
                    </p>
                    <p className="text-[15px] font-bold text-slate-900 leading-snug mt-0.5">{emojiDeTipo(a.tipo)} {a.titulo}</p>
                    {vigencia && <p className="text-[13px] font-semibold text-rey-700 mt-0.5">{vigencia}</p>}
                    {a.texto && <p className="text-[13px] text-slate-600 leading-snug mt-1">{a.texto}</p>}
                  </div>
                </div>
                {a.imagenUrl && (
                  <img src={a.imagenUrl} alt="" loading="lazy" className="mt-3 w-full max-h-64 object-cover rounded-xl bg-slate-100" />
                )}
                <button
                  type="button" onClick={() => onVerTienda(a.tiendaId)}
                  className="mt-3 w-full py-2.5 rounded-xl bg-rey-600 text-white text-[13px] font-bold flex items-center justify-center gap-1.5 hover:bg-rey-700 transition"
                >
                  <Store size={16} strokeWidth={1.75} /> Ver su catálogo
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
