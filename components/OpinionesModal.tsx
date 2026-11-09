/**
 * «Opiniones de tu tienda»: lo que dicen quienes le escribieron, y la forma de
 * responderles.
 *
 * La tienda puede contestar pero no borrar ni cambiar una opinión: una opinión
 * que su dueña puede editar no le dice nada a quien la lee. Si es un abuso, se
 * le pide al administrador que la oculte.
 */
import React, { useEffect, useState } from 'react';
import { getCurrentUserId } from '../services/messagingService';
import {
  opinionesDe, resumenDeCalificaciones, responderOpinion,
  type Opinion, type ResumenDeCalificaciones,
} from '../services/calificacionesService';
import { estrellasEnTexto, promedioEnTexto, textoDeOpiniones } from '../utils/calificaciones';
import { haceCuanto } from '../utils/avisos';

interface Props {
  onClose: () => void;
  /** Abre el QR: es como una tienda consigue que la califiquen. */
  onCompartirQr: () => void;
}

export const OpinionesModal: React.FC<Props> = ({ onClose, onCompartirQr }) => {
  const [resumen, setResumen] = useState<ResumenDeCalificaciones | null | undefined>(undefined);
  const [opiniones, setOpiniones] = useState<Opinion[]>([]);
  const [respondiendo, setRespondiendo] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    let id: string;
    try { id = getCurrentUserId(); } catch { setResumen(null); return; }
    setResumen(await resumenDeCalificaciones(id));
    setOpiniones(await opinionesDe(id, 30));
  };
  useEffect(() => { void cargar(); }, []);

  const abrirRespuesta = (o: Opinion) => {
    setRespondiendo(o.id);
    setBorrador(o.respuesta ?? '');
    setError(null);
  };

  const enviar = async (o: Opinion, texto: string) => {
    try {
      await responderOpinion(o.id, texto);
      setRespondiendo(null);
      setError(null);
      await cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[100] flex justify-center items-start pt-6 px-3 overflow-y-auto" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl mb-6" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Opiniones de tu tienda</h2>
            <p className="text-sm text-slate-600 mt-1">
              {resumen === undefined
                ? 'Cargando…'
                : !resumen || resumen.total === 0
                  ? 'Todavía nadie te ha calificado.'
                  : <>
                      <span className="text-amber-500 tracking-wider">{estrellasEnTexto(resumen.promedio)}</span>{' '}
                      <b className="text-slate-900">{promedioEnTexto(resumen.promedio)}</b> · {textoDeOpiniones(resumen.total)}
                    </>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-10 h-10 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-5 space-y-3">
          {resumen && resumen.total === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 leading-snug">
              Pueden calificarte las personas que te hayan escrito por el chat, desde tu catálogo.{' '}
              <button type="button" onClick={onCompartirQr} className="font-bold underline underline-offset-2">Ver mi código QR</button>
            </div>
          )}

          {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>}

          {opiniones.map(o => (
            <div key={o.id} className="border border-slate-200 rounded-xl p-3.5">
              <div className="flex justify-between items-baseline gap-2">
                <span className="font-bold text-slate-900 text-[15px]">{o.nombre}</span>
                <span className="text-xs text-slate-400 shrink-0">{haceCuanto(o.creado)}</span>
              </div>
              <p className="text-amber-500 tracking-wider text-base mt-0.5">{estrellasEnTexto(o.estrellas)}</p>
              <p className="text-[15px] text-slate-800 leading-snug mt-1 whitespace-pre-wrap break-words">{o.comentario}</p>

              {respondiendo === o.id ? (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={borrador} onChange={e => setBorrador(e.target.value)} maxLength={300} rows={3} autoFocus
                    placeholder="Escribe tu respuesta. Cualquiera que vea tu catálogo la leerá."
                    className="w-full p-3 text-base rounded-xl border border-slate-300 focus:border-rey-500 focus:ring-2 focus:ring-rey-100 outline-none resize-none"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button" onClick={() => enviar(o, borrador)} disabled={!borrador.trim()}
                      className="px-4 py-2.5 rounded-lg bg-rey-600 text-white font-bold text-[15px] disabled:opacity-40"
                    >
                      Publicar respuesta
                    </button>
                    <button type="button" onClick={() => setRespondiendo(null)} className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-[15px]">
                      Cancelar
                    </button>
                    {o.respuesta && (
                      <button type="button" onClick={() => enviar(o, '')} className="px-2 py-2.5 text-rose-600 font-bold text-sm underline underline-offset-2">
                        Quitar mi respuesta
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {o.respuesta && (
                    <div className="mt-3 bg-rey-50 rounded-lg p-2.5 text-sm text-rey-900">
                      <b>Tu respuesta: </b><span className="whitespace-pre-wrap break-words">{o.respuesta}</span>
                    </div>
                  )}
                  <button type="button" onClick={() => abrirRespuesta(o)} className="mt-3 text-rey-700 font-bold text-[15px] underline underline-offset-2 py-1">
                    {o.respuesta ? 'Cambiar mi respuesta' : 'Responder'}
                  </button>
                </>
              )}
            </div>
          ))}

          {resumen && resumen.total > 0 && opiniones.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">Por ahora solo tienes estrellas, sin comentarios.</p>
          )}
        </div>
      </div>
    </div>
  );
};
