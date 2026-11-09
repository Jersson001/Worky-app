/**
 * «Ya tengo cuenta» en un catálogo: a qué tienda se vuelve después de entrar.
 *
 * Quien ya tiene cuenta y solo quería seguir una tienda no debe terminar dentro
 * de un chat que no pidió: entra y regresa al catálogo que estaba mirando. El
 * destino se guarda con la hora y caduca a la media hora, para que un «Ya tengo
 * cuenta» que no se terminó no mande a nadie a un catálogo días después, cuando
 * entre por otro motivo.
 */
const VIGENCIA_MS = 30 * 60 * 1000;
const ID_DE_TIENDA = /^[0-9a-f-]{36}$/i;

export const codificarDestino = (tiendaId: string, ahora: number = Date.now()): string =>
  `${tiendaId}|${ahora}`;

/** El id de la tienda, o null si no hay nada, está mal escrito o ya caducó. */
export const leerDestino = (valor: string | null, ahora: number = Date.now()): string | null => {
  if (!valor) return null;
  const [id, hora] = valor.split('|');
  const cuando = Number(hora);
  if (!id || !ID_DE_TIENDA.test(id) || !Number.isFinite(cuando)) return null;
  // Con el reloj del teléfono corrido hacia atrás, «en el futuro» tampoco vale.
  if (ahora - cuando > VIGENCIA_MS || cuando - ahora > 60_000) return null;
  return id;
};
