/**
 * Los avisos de una tienda: cómo se nombran y cómo se escribe cuándo fueron.
 * Todo texto, sin red ni React, para poder probarlo.
 */
export type TipoAviso = 'descuento' | 'lanzamiento' | 'aviso';

export const TIPOS_DE_AVISO: Array<{ tipo: TipoAviso; nombre: string; emoji: string; ejemplo: string }> = [
  { tipo: 'descuento', nombre: 'Descuento', emoji: '🏷️', ejemplo: '20% en todas las cocinas hasta el viernes' },
  { tipo: 'lanzamiento', nombre: 'Producto nuevo', emoji: '🆕', ejemplo: 'Llegó la nueva colección de jeans' },
  { tipo: 'aviso', nombre: 'Otro aviso', emoji: '📣', ejemplo: 'El sábado abrimos hasta las 8 p. m.' },
];

export const emojiDeTipo = (tipo: string): string =>
  TIPOS_DE_AVISO.find(t => t.tipo === tipo)?.emoji ?? '📣';

export const nombreDeTipo = (tipo: string): string =>
  TIPOS_DE_AVISO.find(t => t.tipo === tipo)?.nombre ?? 'Aviso';

/**
 * «hace un momento», «hace 3 h», «ayer», «hace 4 días», y pasado un mes la
 * fecha. Una fecha en el futuro (el reloj del teléfono adelantado) se lee como
 * «hace un momento»: no tiene sentido decirle a nadie «dentro de 2 h».
 */
export const haceCuanto = (iso: string, ahora: Date = new Date()): string => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const minutos = Math.floor((ahora.getTime() - t) / 60000);
  if (minutos < 2) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

/**
 * «Hasta el 20 de noviembre», o «Termina hoy» / «Termina mañana». Vacío si el
 * aviso no tiene fecha límite. `vence` es `YYYY-MM-DD`, la fecha que escribió la
 * tienda, sin hora: se compara como día, no como instante.
 */
export const textoDeVigencia = (vence: string | null | undefined, ahora: Date = new Date()): string => {
  if (!vence) return '';
  const [a, m, d] = vence.split('-').map(Number);
  if (!a || !m || !d) return '';
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const dia = new Date(a, m - 1, d);
  const diferencia = Math.round((dia.getTime() - hoy.getTime()) / 86400000);
  if (diferencia < 0) return 'Ya terminó';
  if (diferencia === 0) return 'Termina hoy';
  if (diferencia === 1) return 'Termina mañana';
  return `Hasta el ${dia.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}`;
};

/** Cuántos avisos son más nuevos que la última vez que se miró la bandeja. */
export const contarSinLeer = (creados: string[], vistoEn: string | null): number => {
  const limite = vistoEn ? new Date(vistoEn).getTime() : 0;
  return creados.filter(c => new Date(c).getTime() > limite).length;
};
