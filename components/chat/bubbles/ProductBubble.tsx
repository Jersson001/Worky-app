/**
 * El producto del catálogo, dentro del chat.
 *
 * Faltaba. El «+ → Catálogo» guardaba el mensaje entero y bien —nombre, precio
 * y fotos—, pero el tipo `product` estaba excluido de la rama que pinta el
 * texto y no tenía ninguna propia, así que en el chat salía una burbuja vacía
 * con solo la hora. Se mandaba y no se veía.
 */
import React from 'react';
import { Message } from '../../../types';
import { formatCurrency } from '../../../utils/currency';

interface ProductBubbleProps {
  msg: Message;
}

/** Las fotos del producto: `images` es lo de ahora, `image` lo de antes. */
const fotosDe = (meta: { images?: string[]; image?: string }): string[] =>
  meta.images?.length ? meta.images : (meta.image ? [meta.image] : []);

export const ProductBubble: React.FC<ProductBubbleProps> = React.memo(({ msg }) => {
  const meta = msg.metadata;
  if (!meta) return null;

  const fotos = fotosDe(meta);
  const [principal, ...resto] = fotos;

  return (
    <div className="max-w-[15rem] -mx-1">
      {principal && (
        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img
            src={principal}
            alt={meta.name || 'Producto'}
            loading="lazy"
            className="w-full h-40 object-cover"
          />
        </div>
      )}

      {/* Las demás fotos, a la vista y no en un carrusel: nadie descubre que
          hay que arrastrar, y quien lo veía creía que solo había una. */}
      {resto.length > 0 && (
        <div className="flex gap-1.5 mt-1.5">
          {resto.slice(0, 3).map((foto, i) => (
            <img
              key={i}
              src={foto}
              alt=""
              loading="lazy"
              className="w-12 h-12 rounded-lg object-cover border border-slate-200"
            />
          ))}
          {resto.length > 3 && (
            <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-[11px] font-bold flex items-center justify-center">
              +{resto.length - 3}
            </div>
          )}
        </div>
      )}

      <div className="px-1 mt-2">
        <h4 className="font-bold text-slate-900 text-sm leading-snug">
          {meta.name || 'Producto'}
        </h4>

        {meta.description?.trim() && (
          <p className="text-xs text-slate-600 mt-1 leading-snug">{meta.description}</p>
        )}

        {/* El precio solo si lo tiene. Un catálogo se comparte muchas veces sin
            precio —se cotiza aparte—, y un «$ 0» ahí parece que es gratis. */}
        {Number(meta.price) > 0 && (
          <p className="text-base font-extrabold text-blue-700 mt-1.5">
            {formatCurrency(meta.price)}
          </p>
        )}
      </div>
    </div>
  );
});

ProductBubble.displayName = 'ProductBubble';
