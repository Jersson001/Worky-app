/**
 * «Avisos a tus seguidores»: la tienda publica un descuento, un producto nuevo o
 * una novedad, y les llega a quienes la siguen.
 *
 * Pensada para quien no es de tecnología: tres botones grandes para elegir qué
 * clase de aviso es, un título, y lo demás opcional. Antes de enviar se
 * confirma con cuántas personas, porque un aviso enviado no se retira.
 */
import React, { useEffect, useState } from 'react';
import ProFeatureGuard from './ProFeatureGuard';
import { leerImagenReducida } from '../utils/imagen';
import { uploadPhoto } from '../services/storageService';
import {
  avisosPublicados, borrarAviso, cuantosMeSiguen, publicarAviso,
  type AvisoPublicado,
} from '../services/avisosService';
import { TIPOS_DE_AVISO, emojiDeTipo, haceCuanto, textoDeVigencia, type TipoAviso } from '../utils/avisos';

interface Props {
  onClose: () => void;
  isPro?: boolean;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  /** Abre el QR de la tienda, que es como consigue seguidores. */
  onCompartirQr: () => void;
}

const CAMPO = 'w-full bg-white p-3 text-base rounded-xl border border-slate-300 focus:border-rey-500 focus:ring-2 focus:ring-rey-100 outline-none';

export const PublicarAvisoModal: React.FC<Props> = ({ onClose, isPro, trialEndsAt, subscriptionEndsAt, onCompartirQr }) => {
  const [seguidores, setSeguidores] = useState<number | null | undefined>(undefined);
  const [publicados, setPublicados] = useState<AvisoPublicado[]>([]);
  const [tipo, setTipo] = useState<TipoAviso>('descuento');
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [venceEn, setVenceEn] = useState('');
  /** La foto elegida, ya reducida, todavía sin subir: sube al enviar. */
  const [foto, setFoto] = useState('');
  const [preparandoFoto, setPreparandoFoto] = useState(false);
  // Las confirmaciones van dentro de la pantalla, no en el cuadro del navegador:
  // en los navegadores que abren WhatsApp o Instagram ese cuadro no aparece y
  // cuenta como «no», así que el envío se cancelaba sin decir nada.
  const [confirmando, setConfirmando] = useState(false);
  const [quitando, setQuitando] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargar = async () => {
    setSeguidores(await cuantosMeSiguen());
    setPublicados(await avisosPublicados());
  };
  useEffect(() => { void cargar(); }, []);

  const ejemplo = TIPOS_DE_AVISO.find(t => t.tipo === tipo)?.ejemplo ?? '';
  const hoy = new Date().toISOString().slice(0, 10);
  const sinSeguidores = seguidores === 0;

  const elegirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // para poder elegir la misma otra vez
    if (!archivo) return;
    setPreparandoFoto(true);
    setMensaje(null);
    const reducida = await leerImagenReducida(archivo);
    setPreparandoFoto(false);
    if (reducida) setFoto(reducida);
    else setMensaje({ ok: false, texto: 'No pudimos leer esa foto. Prueba con otra.' });
  };

  const aQuien = seguidores && seguidores > 0
    ? `a ${seguidores} ${seguidores === 1 ? 'persona' : 'personas'}`
    : 'a tus seguidores (por ahora ninguno)';

  const enviar = async () => {
    setConfirmando(false);
    setEnviando(true);
    setMensaje(null);
    try {
      // La foto sube primero: si falla, no sale un aviso a medias sin ella.
      let imagenUrl = '';
      if (foto) {
        try {
          imagenUrl = await uploadPhoto(foto, 'avisos');
        } catch {
          throw new Error('No se pudo subir la foto. Revisa tu conexión e inténtalo de nuevo.');
        }
      }
      await publicarAviso({ tipo, titulo, texto, venceEn, imagenUrl });
      setMensaje({ ok: true, texto: 'Listo, tu aviso salió. Les llega como notificación a quienes tienen Worky instalado, y a todos en sus novedades.' });
      setTitulo('');
      setTexto('');
      setVenceEn('');
      setFoto('');
      await cargar();
    } catch (e) {
      setMensaje({ ok: false, texto: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  };

  const quitar = async (a: AvisoPublicado) => {
    setQuitando(null);
    try {
      await borrarAviso(a.id);
      setPublicados(p => p.filter(x => x.id !== a.id));
    } catch (e) {
      setMensaje({ ok: false, texto: (e as Error).message });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[100] flex justify-center items-start pt-6 px-3 overflow-y-auto" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl mb-6" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Avisos a tus seguidores</h2>
            <p className="text-sm text-slate-600 mt-1">
              {seguidores === undefined
                ? 'Cargando…'
                : seguidores === null
                  ? 'Avisa de un descuento o de un producto nuevo.'
                  : seguidores === 0
                    ? 'Todavía nadie te sigue.'
                    : <><b className="text-slate-900">{seguidores}</b> {seguidores === 1 ? 'persona te sigue' : 'personas te siguen'}.</>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="w-10 h-10 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {sinSeguidores && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 leading-snug">
              Quien escanee tu código QR y toque <b>«Seguir tienda»</b> empezará a recibir tus avisos.{' '}
              <button type="button" onClick={onCompartirQr} className="font-bold underline underline-offset-2">Ver mi código QR</button>
            </div>
          )}

          <ProFeatureGuard isPro={isPro} trialEndsAt={trialEndsAt} subscriptionEndsAt={subscriptionEndsAt}>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-700 mb-2">¿Qué quieres avisar?</p>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS_DE_AVISO.map(t => (
                    <button
                      key={t.tipo} type="button" onClick={() => setTipo(t.tipo)}
                      aria-pressed={tipo === t.tipo}
                      className={`rounded-xl border-2 py-3 px-1 text-center transition ${tipo === t.tipo ? 'border-rey-600 bg-rey-50 text-rey-800' : 'border-slate-200 bg-white text-slate-700'}`}
                    >
                      <span className="block text-2xl leading-none">{t.emoji}</span>
                      <span className="block text-[13px] font-bold mt-1.5 leading-tight">{t.nombre}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="aviso-titulo">Título</label>
                <input
                  id="aviso-titulo" className={CAMPO} value={titulo} maxLength={80}
                  onChange={e => setTitulo(e.target.value)} placeholder={ejemplo}
                />
                <p className="text-xs text-slate-500 mt-1">Es lo que se lee en la notificación. Corto y claro.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="aviso-texto">Más detalles (opcional)</label>
                <textarea
                  id="aviso-texto" className={`${CAMPO} resize-none`} rows={3} value={texto} maxLength={500}
                  onChange={e => setTexto(e.target.value)} placeholder="Qué incluye, cómo aprovecharlo, dónde…"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="aviso-vence">Válido hasta (opcional)</label>
                <input id="aviso-vence" type="date" className={CAMPO} value={venceEn} min={hoy} onChange={e => setVenceEn(e.target.value)} />
                <p className="text-xs text-slate-500 mt-1">Pasada esa fecha, el aviso desaparece solo de sus novedades.</p>
              </div>

              <div>
                <p className="block text-sm font-bold text-slate-700 mb-1.5">Foto (opcional)</p>
                <input type="file" accept="image/*" onChange={elegirFoto} className="hidden" id="aviso-foto" />
                {foto ? (
                  <div className="relative">
                    <img src={foto} alt="Foto del aviso" className="w-full max-h-56 object-cover rounded-xl border border-slate-200" />
                    <button
                      type="button" onClick={() => setFoto('')}
                      className="absolute top-2 right-2 bg-white/95 text-rose-700 font-bold text-sm px-3 py-2 rounded-lg shadow"
                    >
                      Quitar foto
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="aviso-foto"
                    className="flex items-center justify-center gap-2 w-full cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-4 text-base font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <i className="fa-solid fa-image text-rey-600"></i>
                    {preparandoFoto ? 'Preparando la foto…' : 'Añadir una foto'}
                  </label>
                )}
                <p className="text-xs text-slate-500 mt-1">Sale en la notificación y en las novedades de tus seguidores.</p>
              </div>

              {titulo.trim().length >= 3 && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Así lo verán</p>
                  {foto && <img src={foto} alt="" className="w-full max-h-40 object-cover rounded-lg mb-2" />}
                  <p className="font-bold text-slate-900 text-base leading-snug">{emojiDeTipo(tipo)} {titulo.trim()}</p>
                  {venceEn && <p className="text-sm text-rey-700 font-semibold mt-0.5">{textoDeVigencia(venceEn)}</p>}
                  {texto.trim() && <p className="text-sm text-slate-600 mt-1">{texto.trim()}</p>}
                </div>
              )}

              {mensaje && (
                <p className={`text-sm rounded-xl p-3 leading-snug ${mensaje.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {mensaje.texto}
                </p>
              )}

              <button
                type="button" onClick={() => { setMensaje(null); setConfirmando(true); }}
                disabled={enviando || preparandoFoto || confirmando || titulo.trim().length < 3}
                className="w-full bg-rey-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-rey-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-paper-plane"></i>
                {enviando ? (foto ? 'Subiendo la foto y enviando…' : 'Enviando…') : 'Enviar a mis seguidores'}
              </button>
              {titulo.trim().length < 3 && !enviando && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-snug -mt-2">
                  Para poder enviar, escribe el <b>título</b> del aviso (mínimo 3 letras).
                </p>
              )}
              {confirmando && (
                <div className="rounded-xl border-2 border-rey-300 bg-rey-50 p-4 space-y-3" role="alertdialog" aria-label="Confirmar el envío">
                  <p className="text-base font-bold text-slate-900 leading-snug">
                    ¿Enviar este aviso {aQuien}?
                  </p>
                  <p className="text-sm text-slate-700 leading-snug">
                    {emojiDeTipo(tipo)} {titulo.trim()}{foto ? ' (con foto)' : ''}
                    <br />Una vez enviado no se puede retirar.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button" onClick={enviar}
                      className="flex-1 bg-rey-600 text-white py-3 rounded-xl text-base font-bold hover:bg-rey-700 transition"
                    >
                      Sí, enviar ahora
                    </button>
                    <button
                      type="button" onClick={() => setConfirmando(false)}
                      className="px-5 py-3 rounded-xl text-base font-semibold bg-white border border-slate-300 text-slate-700"
                    >
                      Revisar
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-500 text-center -mt-2">Puedes enviar hasta 2 avisos al día.</p>
            </div>
          </ProFeatureGuard>

          {publicados.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">Lo que has publicado</h3>
              <div className="space-y-2">
                {publicados.map(a => (
                  <div key={a.id} className="border border-slate-200 rounded-xl p-3 flex items-start gap-3">
                    {a.imagenUrl && <img src={a.imagenUrl} alt="" loading="lazy" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-slate-100" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 leading-snug">{emojiDeTipo(a.tipo)} {a.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {haceCuanto(a.creado)}{a.venceEn ? ` · ${textoDeVigencia(a.venceEn)}` : ''}
                      </p>
                    </div>
                    {quitando === a.id ? (
                      <div className="shrink-0 text-right space-y-1.5">
                        <p className="text-xs text-slate-700 leading-snug max-w-[9rem]">¿Quitarlo de sus novedades? La notificación ya enviada no se retira.</p>
                        <div className="flex gap-1.5 justify-end">
                          <button type="button" onClick={() => quitar(a)} className="text-xs font-bold bg-rose-600 text-white rounded-lg px-3 py-2">Sí, quitar</button>
                          <button type="button" onClick={() => setQuitando(null)} className="text-xs font-semibold bg-white border border-slate-300 text-slate-700 rounded-lg px-3 py-2">No</button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setQuitando(a.id)} className="text-sm font-bold text-rose-600 underline underline-offset-2 shrink-0 py-2 px-1">
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
