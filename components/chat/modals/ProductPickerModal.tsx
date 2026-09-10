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
      {/* Por foto: en el chat se manda una imagen para enseñar algo. Con el
          producto entero, uno de doce fotos llenaba la conversación de
          miniaturas y parecía la carpeta entera. En la cotización va sin esto,
          porque allí la línea sí quiere todas. */}
      <CatalogBrowser
        products={products}
        categories={categories}
        porFoto
        onSelectProduct={(p) => { onSelectProduct(p); onClose(); }}
      />
    </div>
  </ModalWrapper>
));

ProductPickerModal.displayName = 'ProductPickerModal';
