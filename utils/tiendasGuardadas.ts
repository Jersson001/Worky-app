/**
 * Las tiendas que alguien guarda para volver.
 *
 * Viven en el navegador de su teléfono y no salen de ahí: quien escanea un QR
 * no tiene cuenta, y pedirle una para poder guardar sería perderlo en la
 * puerta. El precio es que se pierden si cambia de teléfono o limpia los datos,
 * y por eso al guardar la primera se le ofrece crear cuenta.
 *
 * Está aparte porque lo leen dos sitios que no se parecen en nada: la página
 * pública del catálogo —que se pinta a mano, sin React, antes de montar la
 * app— y la agenda de tiendas de la pantalla de inicio.
 */

const TIENDAS_KEY = 'worky:tiendas-guardadas';

export interface TiendaGuardada {
  /** El id del vendedor: con él se abre su catálogo y su chat. */
  id: string;
  negocio: string;
  /** Local, centro comercial y dirección, ya juntos. */
  ubicacion?: string;
  ciudad?: string;
  logo?: string;
  enlace: string;
  guardadaEn: string;
}

/** Leer nunca tumba la página: en incógnito `localStorage` lanza al tocarlo. */
export const leerTiendas = (): TiendaGuardada[] => {
  try {
    const crudo = localStorage.getItem(TIENDAS_KEY);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista.filter(t => t && typeof t.id === 'string') : [];
  } catch {
    return [];
  }
};

/** Devuelve si pudo: sin sitio o sin permiso se avisa, no se finge. */
export const escribirTiendas = (lista: TiendaGuardada[]): boolean => {
  try {
    localStorage.setItem(TIENDAS_KEY, JSON.stringify(lista));
    return true;
  } catch {
    return false;
  }
};

export const estaGuardada = (id: string): boolean => leerTiendas().some(t => t.id === id);

/** La guarda arriba del todo: la última que interesó es la que se busca. */
export const guardarTienda = (tienda: TiendaGuardada): boolean =>
  escribirTiendas([tienda, ...leerTiendas().filter(t => t.id !== tienda.id)]);

export const quitarTienda = (id: string): boolean =>
  escribirTiendas(leerTiendas().filter(t => t.id !== id));
