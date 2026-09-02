/**
 * CatalogPicker — buscador del catálogo para elegir productos.
 *
 * Reemplaza a la lista plana que había dentro de la cotización. Con un
 * catálogo grande —un proveedor de uniformes con decenas de modelos y varias
 * fotos cada uno— esa lista era inservible: había que bajar a ojo hasta dar con
 * la foto. Aquí se entra por carpetas, igual que en «Catálogo de Productos», y
 * hay una búsqueda por nombre que atraviesa todas las carpetas.
 *
 * Se queda abierto al elegir, porque una cotización normal lleva varios ítems y
 * cerrarlo en cada uno obligaba a volver a buscar la carpeta desde el principio.
 */
import React, { useMemo, useState } from 'react';
import { Product, ProductCategory } from '../../../types';
import { formatCurrency } from '../../../utils/currency';

interface CatalogBrowserProps {
  products: Product[];
  categories: ProductCategory[];
  /** Se llama por cada producto elegido. El panel no se cierra. */
  onSelectProduct: (product: Product) => void;
}

/** Carpeta imaginaria para los productos que nadie clasificó. */
const SIN_CARPETA = '__sin_carpeta__';

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({
  products, categories, onSelectProduct,
}) => {
  const [carpetaAbierta, setCarpetaAbierta] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  /** Cuántas veces se agregó cada producto, para dar acuse en el propio botón. */
  const [agregados, setAgregados] = useState<Record<string, number>>({});

  const termino = busqueda.trim().toLowerCase();
  const buscando = termino.length > 0;

  const sinCarpeta = useMemo(
    () => products.filter(p => !p.categoryId || !categories.some(c => c.id === p.categoryId)),
    [products, categories],
  );

  const visibles = useMemo(() => {
    if (buscando) {
      return products.filter(p =>
        p.name?.toLowerCase().includes(termino) ||
        p.description?.toLowerCase().includes(termino));
    }
    if (carpetaAbierta === SIN_CARPETA) return sinCarpeta;
    if (carpetaAbierta) return products.filter(p => p.categoryId === carpetaAbierta);
    return [];
  }, [products, buscando, termino, carpetaAbierta, sinCarpeta]);

  const nombreDeCarpeta = (id?: string) => {
    if (!id) return 'Sin carpeta';
    return categories.find(c => c.id === id)?.name ?? 'Sin carpeta';
  };

  const elegir = (p: Product) => {
    onSelectProduct(p);
    setAgregados(prev => ({ ...prev, [p.id]: (prev[p.id] || 0) + 1 }));
  };

  const enPortada = (categoria: ProductCategory) =>
    products.filter(p => p.categoryId === categoria.id).slice(0, 4).map(p => p.image);

  return (
    <div className="flex flex-col h-full">
      {/* Búsqueda: atraviesa todas las carpetas, que es de lo que se trata */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto por nombre…"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {buscando && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          )}
        </div>

        {!buscando && carpetaAbierta && (
          <button
            type="button"
            onClick={() => setCarpetaAbierta(null)}
            className="mt-2 text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-arrow-left text-[10px]"></i>
            {nombreDeCarpeta(carpetaAbierta === SIN_CARPETA ? undefined : carpetaAbierta)}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-3">
        {/* Vista de carpetas */}
        {!buscando && !carpetaAbierta && (
          categories.length === 0 && sinCarpeta.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-xs italic">
              No hay productos en el catálogo. Agrégalos desde «Catálogo de Productos».
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {categories.map(categoria => {
                const fotos = enPortada(categoria);
                const cuantos = products.filter(p => p.categoryId === categoria.id).length;
                return (
                  <button
                    key={categoria.id}
                    type="button"
                    onClick={() => setCarpetaAbierta(categoria.id)}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-md transition text-left"
                  >
                    <div className="aspect-square bg-slate-100 overflow-hidden">
                      {categoria.coverImage ? (
                        <img src={categoria.coverImage} alt="" className="w-full h-full object-cover" />
                      ) : fotos.length > 0 ? (
                        <div className="w-full h-full grid grid-cols-2 gap-0.5 p-0.5">
                          {fotos.map((foto, i) => (
                            <img key={i} src={foto} alt="" className="w-full h-full object-cover rounded" />
                          ))}
                          {Array.from({ length: Math.max(0, 4 - fotos.length) }).map((_, i) => (
                            <div key={`hueco-${i}`} className="bg-slate-100 rounded" />
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <i className={`${categoria.icon} text-3xl`}></i>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-[11px] font-bold text-slate-800 truncate">{categoria.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {cuantos} producto{cuantos === 1 ? '' : 's'}
                      </div>
                    </div>
                  </button>
                );
              })}

              {sinCarpeta.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCarpetaAbierta(SIN_CARPETA)}
                  className="bg-white border border-dashed border-slate-300 rounded-xl overflow-hidden hover:border-blue-400 transition text-left"
                >
                  <div className="aspect-square bg-slate-50 flex items-center justify-center text-slate-300">
                    <i className="fa-solid fa-box text-3xl"></i>
                  </div>
                  <div className="p-2">
                    <div className="text-[11px] font-bold text-slate-800 truncate">Sin carpeta</div>
                    <div className="text-[10px] text-slate-500">
                      {sinCarpeta.length} producto{sinCarpeta.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </button>
              )}
            </div>
          )
        )}

        {/* Lista de productos: dentro de una carpeta o resultado de la búsqueda */}
        {(buscando || carpetaAbierta) && (
          visibles.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-xs italic">
              {buscando ? 'Ningún producto se llama así.' : 'Esta carpeta está vacía.'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {visibles.map(p => {
                const veces = agregados[p.id] || 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => elegir(p)}
                    className="w-full flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition text-left"
                  >
                    <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{p.name}</div>
                      <div className="text-[11px] font-bold text-blue-600">{formatCurrency(p.price)}</div>
                      {buscando && (
                        <div className="text-[10px] text-slate-400 truncate">
                          <i className="fa-solid fa-folder text-[9px] mr-1"></i>
                          {nombreDeCarpeta(p.categoryId)}
                        </div>
                      )}
                    </div>
                    {veces > 0 ? (
                      <span className="flex-shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-1">
                        <i className="fa-solid fa-check mr-1"></i>{veces}
                      </span>
                    ) : (
                      <i className="fa-solid fa-plus text-blue-500 flex-shrink-0 px-1.5"></i>
                    )}
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};

interface CatalogPickerOverlayProps extends CatalogBrowserProps {
  onClose: () => void;
}

/**
 * El buscador montado como panel flotante que cubre otro modal. Se usa desde
 * la cotización, para no sacar al usuario del formulario que está llenando.
 */
export const CatalogPickerOverlay: React.FC<CatalogPickerOverlayProps> = ({
  products, categories, onSelectProduct, onClose,
}) => (
  <div className="absolute inset-0 z-20 flex flex-col bg-slate-100 rounded-2xl overflow-hidden animate-fade-in">
    <div className="flex items-center gap-2.5 p-3.5 flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700">
      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
        <i className="fa-solid fa-box-open text-xs text-white"></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-white">Catálogo de Productos</div>
        <div className="text-[10px] font-semibold text-white/70">Elige los que van en la cotización</div>
      </div>
      <button type="button" onClick={onClose} className="text-white/70 hover:text-white transition p-1">
        <i className="fa-solid fa-xmark text-sm"></i>
      </button>
    </div>

    <div className="flex-1 min-h-0">
      <CatalogBrowser products={products} categories={categories} onSelectProduct={onSelectProduct} />
    </div>

    <div className="p-3 flex-shrink-0 bg-white border-t border-slate-200">
      <button
        type="button"
        onClick={onClose}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl transition active:scale-[0.99] flex items-center justify-center gap-2"
      >
        <i className="fa-solid fa-check"></i> Listo
      </button>
    </div>
  </div>
);
