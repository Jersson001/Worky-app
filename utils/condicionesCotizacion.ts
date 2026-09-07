/**
 * Las condiciones de negociación que van al pie de la cotización.
 *
 * Salen del formato en papel que se usaba antes de Worky: la parte que no es
 * el precio pero es la que evita el pleito —hasta cuándo vale la oferta, qué
 * no incluye, qué tiene que poner la obra, qué cubre la garantía—. Sin ellas
 * el cliente aprueba una cifra y luego discute todo lo demás.
 *
 * Son de carpintería y obra. En un oficio donde se cotiza y se entrega en el
 * día no pintan nada, y obligar a todo el mundo a apagarlas sería peor.
 */
import { CondicionesCotizacion, BloqueCondiciones, GremioKey } from '../types';

/** Un bloque nuevo, con su título y su texto. */
const bloque = (titulo: string, lineas: string[], activo = true): BloqueCondiciones => ({
  activo,
  titulo,
  texto: lineas.join('\n'),
});

/**
 * Las condiciones que le tocan a un oficio.
 *
 * Un taller de uniformes no tiene nada que ver con una obra: enseñarle «el
 * sitio debe estar en obra blanca» le dice que la aplicación no es para él.
 */
export const condicionesDeFabrica = (gremios: GremioKey[]): CondicionesCotizacion =>
  gremios.includes('confeccion') ? CONDICIONES_CONFECCION() : CONDICIONES_POR_DEFECTO();

/**
 * Lo que trae la plantilla de obra cuando nadie la ha tocado.
 *
 * Se escribe en primera persona del negocio y en condicional donde toca: es
 * texto que el cliente lee, no notas internas. Quien tenga otras condiciones
 * las edita una vez y se le quedan guardadas.
 */
export const CONDICIONES_POR_DEFECTO = (): CondicionesCotizacion => ({
  entrega: bloque('Tiempo de entrega', [
    'El contrato se inicia el día del anticipo, con un tiempo de entrega de 15 días hábiles.',
    'La entrega se cuenta desde la aprobación de planos técnicos y/o renders.',
  ]),
  noIncluye: bloque('Nuestra oferta no incluye', [
    'Cualquier otra actividad no descrita en esta cotización.',
  ]),
  suministros: bloque('Suministros por parte de la obra', [
    'Área segura para el almacenamiento de herramientas y objetos personales de los trabajadores.',
    'Energía a 110 voltios en los sitios de instalación.',
    'El sitio debe estar en obra blanca.',
    'Seguridad de los materiales, las herramientas y los trabajos durante su ejecución.',
    'Redes y salidas eléctricas, hidráulicas y sanitarias totalmente definidas.',
  ]),
  garantia: bloque('Garantía', [
    'Un año por defectos de fabricación.',
    'Se pierde si los muebles son manipulados por personal ajeno a la empresa.',
    'No cubre inundación, fugas de agua ni humedad del sitio posteriores a la instalación.',
  ]),
  notas: bloque('Notas', [
    'Se deben verificar medidas en sitio.',
    'La cotización queda sujeta a cambios después de rectificar medidas en planos.',
  ]),
});

/**
 * Lo que trae la plantilla de confección.
 *
 * El pleito de un taller de uniformes no es el de una obra. Aquí lo que se
 * discute son las tallas —quién las dio y hasta cuándo se cambian—, el color
 * entre lotes de tela y cuándo arranca de verdad la producción. De ahí que
 * tenga un apartado propio de cambios, que en obra no hace falta.
 */
export const CONDICIONES_CONFECCION = (): CondicionesCotizacion => ({
  entrega: bloque('Tiempo de entrega', [
    'La producción arranca con el anticipo y la muestra aprobada, no antes.',
    'El tiempo de entrega es de 15 días hábiles desde esa aprobación.',
    'Los cambios pedidos después del corte reinician el plazo.',
  ]),
  suministros: bloque('Lo que pone el cliente', [
    'El logo en alta resolución o en vectores, para poder bordarlo o estamparlo.',
    'El listado de tallas por persona, confirmado por escrito.',
    'La aprobación de la muestra antes de producir.',
  ]),
  cambios: bloque('Cambios y tallas', [
    'Los cambios de talla se reciben hasta 8 días después de la entrega.',
    'La prenda debe estar sin usar, sin lavar y con sus etiquetas.',
    'Si el listado de tallas lo entregó el cliente, el cambio se cobra aparte.',
    'Las prendas personalizadas con un nombre no se cambian ni se devuelven.',
  ]),
  garantia: bloque('Garantía', [
    'Seis meses por defectos de confección: costuras, cierres y botones.',
    'No cubre el desgaste normal por el uso ni la decoloración por el lavado.',
    'Se pierde por lavado en agua caliente, cloro, secadora o plancha directa '
      + 'sobre el bordado, y por arreglos hechos fuera del taller.',
  ]),
  noIncluye: bloque('Nuestra oferta no incluye', [
    'Bordados, estampados ni reflectivos que no estén en esta cotización.',
    'Toma de medidas en sitio, salvo que se acuerde aparte.',
    'Transporte fuera de la ciudad.',
  ]),
  notas: bloque('Notas', [
    'El color puede variar levemente entre lotes de tela.',
    'Los precios se sostienen mientras dure la validez de esta cotización.',
  ]),
});

/** El orden en que se muestran y se imprimen. */
export const ORDEN_CONDICIONES: (keyof CondicionesCotizacion)[] =
  ['entrega', 'noIncluye', 'suministros', 'cambios', 'garantia', 'notas'];

/**
 * Quién ve las condiciones.
 *
 * Solo carpintería y obra blanca: son los oficios donde se pacta un plazo, un
 * anticipo y una garantía. Los porcentajes de pago y la cuenta, en cambio,
 * los ve todo el mundo —cobrar se cobra en todos los oficios—.
 */
export const usaCondiciones = (gremios: GremioKey[]): boolean => gremios.length > 0;

/** Las líneas de un bloque, ya limpias. Vacío si no hay nada que decir. */
export const lineasDe = (b?: BloqueCondiciones): string[] =>
  b?.activo ? b.texto.split('\n').map(l => l.trim()).filter(Boolean) : [];

/** Si hay algo que imprimir en el pie de condiciones. */
export const hayCondiciones = (c?: CondicionesCotizacion): boolean =>
  !!c && ORDEN_CONDICIONES.some(k => lineasDe(c[k]).length > 0);

/**
 * Reparte el total entre el anticipo y el saldo.
 *
 * El saldo se calcula por resta y no con su propio porcentaje: así los dos
 * números suman siempre el total, sin céntimos perdidos por redondeo.
 */
export const repartoDePago = (total: number, anticipoPorcentaje: number) => {
  const pct = Math.min(100, Math.max(0, anticipoPorcentaje || 0));
  const anticipo = Math.round(total * pct / 100);
  return { porcentajeAnticipo: pct, porcentajeSaldo: 100 - pct, anticipo, saldo: total - anticipo };
};
