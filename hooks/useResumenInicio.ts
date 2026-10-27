/**
 * Carga las cifras del Inicio —por cobrar, cotizaciones pendientes y caja del
 * mes— sin frenar la pantalla: el Inicio se pinta de una vez con «—» y las cifras
 * entran cuando llegan.
 *
 * El Inicio se vuelve a montar cada vez que se sale de un chat, y cada montaje
 * pediría tres consultas. Se guarda lo último unos segundos: lo bastante para
 * que ir y volver no repita todo, y poco para que, al mandar un documento y
 * regresar, la cifra no se quede vieja.
 */
import { useCallback, useEffect, useState } from 'react';
import { cargarResumenDelInicio, ResumenDelInicio } from '../services/inicioService';
import type { ContactoConocido } from '../utils/finanzas';

const VIGENCIA_MS = 20_000;

let guardado: { cuando: number; clave: string; datos: ResumenDelInicio } | null = null;

export const useResumenInicio = (contactos: ContactoConocido[]) => {
  // Cambia cuando entra o sale un contacto, no con cada mensaje que llega: los
  // contactos se parchean en cada mensaje y recargar todo por eso sería absurdo.
  const clave = contactos.map(c => c.id).sort().join('|');

  const [datos, setDatos] = useState<ResumenDelInicio | null>(
    guardado && guardado.clave === clave ? guardado.datos : null,
  );
  const [cargando, setCargando] = useState(!datos);

  const cargar = useCallback(async (forzar = false) => {
    if (!forzar && guardado && guardado.clave === clave && Date.now() - guardado.cuando < VIGENCIA_MS) {
      setDatos(guardado.datos);
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const nuevos = await cargarResumenDelInicio(contactos);
      guardado = { cuando: Date.now(), clave, datos: nuevos };
      setDatos(nuevos);
    } finally {
      setCargando(false);
    }
  }, [clave]);

  useEffect(() => {
    // Sin contactos no hay nada que sumar, y los contactos llegan después de
    // iniciar sesión: pedir antes daría «Sin cliente» en todas las filas.
    if (contactos.length === 0) { setCargando(false); return; }
    void cargar();
  }, [cargar]);

  return { datos, cargando, recargar: () => cargar(true) };
};
