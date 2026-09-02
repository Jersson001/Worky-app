/**
 * ProductPickerModal — elegir un producto del catálogo para mandarlo al chat.
 * El recorrido por carpetas y la búsqueda son los mismos de la cotización.
 */
import React from 'react';
import { ModalWrapper } from './ModalWrapper';
import { CatalogBrowser } from './CatalogPicker';
import { Product, ProductCategory } from '../../../types';

interface ProductPickerModalProps {
  show: boolean;
  onClose: () => void;
  products: Product[];
  categories: ProductCategory[];
  onSelectProduct: (product: Product) => void;
}

export const ProductPickerModal: React.FC<ProductPickerModalProps> = React.memo(({
  show, onClose, products, categories, onSelectProduct,
}) => (
  <ModalWrapper show={show} onClose={onClose} title="Catálogo de Productos" icon="fa-store" iconColor="text-blue-500">
    <div className="-mx-3 h-[60vh]">
      <CatalogBrowser
        products={products}
        categories={categories}
        onSelectProduct={(p) => { onSelectProduct(p); onClose(); }}
      />
    </div>
  </ModalWrapper>
));

ProductPickerModal.displayName = 'ProductPickerModal';
