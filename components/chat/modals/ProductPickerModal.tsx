/**
 * ProductPickerModal — display product catalog for selection.
 */
import React from 'react';
import { ModalWrapper } from './ModalWrapper';
import { Product } from '../../../types';

interface ProductPickerModalProps {
  show: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const ProductPickerModal: React.FC<ProductPickerModalProps> = React.memo(({
  show, onClose, products, onSelectProduct,
}) => {
  return (
    <ModalWrapper show={show} onClose={onClose} title="Catálogo de Productos" icon="fa-store" iconColor="text-blue-500">
      <div className="grid grid-cols-2 gap-2.5 p-0.5">
        {products.map(p => (
          <div
            key={p.id}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-500 hover:shadow-md transition cursor-pointer group"
            onClick={() => { onSelectProduct(p); onClose(); }}
          >
            <div className="h-24 bg-slate-100 flex items-center justify-center overflow-hidden relative">
              <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            </div>
            <div className="p-2.5">
              <div className="font-bold text-xs text-slate-800 truncate">{p.name}</div>
              <div className="text-blue-600 font-bold text-xs mt-1">${p.price.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </ModalWrapper>
  );
});

ProductPickerModal.displayName = 'ProductPickerModal';
