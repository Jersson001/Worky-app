/**
 * Custom hook that encapsulates ALL form state for ChatWindow modals.
 * Extracts 30+ useState calls from the monolithic component.
 */
import { useState, useCallback } from 'react';
import { InvoiceItem, QuoteItem, Product, QuoteMode, CarpentrySection, CarpentryCategoryKey, CarpentryLineItem } from '../types';
import { createCarpentrySection, createBlankCarpentryItem, computeM2FromDimensions } from '../utils/carpentryCalculations';
import { parseMoney } from '../utils/currency';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExpenseFormState {
  amount: string;
  description: string;
  targetProjectId: string;
}

export interface InvoiceFormState {
  items: InvoiceItem[];
  selectedProject: string;
  taxType: 'none' | 'iva' | 'aiu';
}

export interface QuoteFormState {
  items: QuoteItem[];
  validDays: string;
  taxType: 'none' | 'percentage' | 'aiu';
  taxPercentage: string;
  aiuAdmin: string;
  aiuImprevistos: string;
  aiuUtilidad: string;
  aiuIva: string;
  clientAddress: string;
  clientPhone: string;
  showProductPicker: boolean;
  mode: QuoteMode;
  sections: CarpentrySection[];
}

export interface CollectionFormState {
  amount: string;
  concept: string;
  directedTo: string;
  nit: string;
  selectedAccount: string;
  selectedProject: string;
}

export interface ReceiptFormState {
  amount: string;
  concept: string;
  selectedAccount: string;
}

export interface ModalVisibility {
  expense: boolean;
  invoice: boolean;
  quote: boolean;
  collection: boolean;
  receipt: boolean;
  productPicker: boolean;
  paymentConfirm: boolean;
  qrPreview: boolean;
}

export interface ChatFormActions {
  // Expense
  expense: ExpenseFormState;
  setExpenseField: <K extends keyof ExpenseFormState>(field: K, value: ExpenseFormState[K]) => void;
  resetExpense: () => void;

  // Invoice
  invoice: InvoiceFormState;
  addInvoiceItem: () => void;
  updateInvoiceItem: (index: number, field: keyof InvoiceItem, value: any) => void;
  deleteInvoiceItem: (index: number) => void;
  setInvoiceField: <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => void;
  resetInvoice: () => void;

  // Quote
  quote: QuoteFormState;
  addQuoteItem: () => void;
  addProductToQuote: (product: Product) => void;
  updateQuoteItem: (index: number, field: keyof QuoteItem, value: any) => void;
  updateQuoteItemPrice: (index: number, value: string) => void;
  deleteQuoteItem: (index: number) => void;
  addQuoteItemImages: (index: number, newImages: string[]) => void;
  removeQuoteItemImage: (itemIndex: number, imageIndex: number) => void;
  updateQuoteItemImage: (index: number, url: string) => void;
  setQuoteField: <K extends keyof QuoteFormState>(field: K, value: QuoteFormState[K]) => void;
  resetQuote: (contactPhone?: string) => void;
  setQuoteMode: (mode: QuoteMode) => void;
  addCarpentrySection: (category: CarpentryCategoryKey) => void;
  removeCarpentrySection: (sectionId: string) => void;
  addCarpentryItem: (sectionId: string, groupId: string) => void;
  updateCarpentryItem: (sectionId: string, groupId: string, itemId: string, field: keyof CarpentryLineItem, value: any) => void;
  removeCarpentryItem: (sectionId: string, groupId: string, itemId: string) => void;

  // Collection
  collection: CollectionFormState;
  setCollectionField: <K extends keyof CollectionFormState>(field: K, value: CollectionFormState[K]) => void;
  resetCollection: (clientName: string) => void;

  // Receipt
  receipt: ReceiptFormState;
  setReceiptField: <K extends keyof ReceiptFormState>(field: K, value: ReceiptFormState[K]) => void;
  resetReceipt: () => void;

  // Modal visibility
  modals: ModalVisibility;
  openModal: (modal: keyof ModalVisibility) => void;
  closeModal: (modal: keyof ModalVisibility) => void;

  // Payment confirmation
  pendingPayment: { id: string; type: string; metadata: any } | null;
  setPendingPayment: (payment: { id: string; type: string; metadata: any } | null) => void;

  // QR preview
  qrPreviewData: { qrUrl: string; metadata: any } | null;
  setQrPreviewData: (data: { qrUrl: string; metadata: any } | null) => void;

  // Copy state
  copiedText: string | null;
  setCopiedText: (text: string | null) => void;
}

// ─── Default states ──────────────────────────────────────────────────────────

const DEFAULT_EXPENSE: ExpenseFormState = { amount: '', description: '', targetProjectId: '' };
const DEFAULT_INVOICE: InvoiceFormState = { items: [{ description: '', quantity: 1, price: 0 }], selectedProject: '', taxType: 'none' };
const DEFAULT_QUOTE_BASE: Omit<QuoteFormState, 'clientPhone'> = {
  items: [{ description: '', quantity: 1, price: 0 }],
  validDays: '15',
  taxType: 'none',
  taxPercentage: '19',
  aiuAdmin: '5',
  aiuImprevistos: '5',
  aiuUtilidad: '5',
  aiuIva: '19',
  clientAddress: '',
  showProductPicker: false,
  mode: 'basica',
  sections: [],
};
const DEFAULT_RECEIPT: ReceiptFormState = { amount: '', concept: '', selectedAccount: '' };
const DEFAULT_MODALS: ModalVisibility = {
  expense: false, invoice: false, quote: false,
  collection: false, receipt: false, productPicker: false,
  paymentConfirm: false, qrPreview: false,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useChatFormState = (
  initialClientName: string,
  initialPhone: string,
  initialProjectId: string
): ChatFormActions => {
  // ── Expense ──
  const [expense, setExpense] = useState<ExpenseFormState>({ ...DEFAULT_EXPENSE, targetProjectId: initialProjectId });
  const setExpenseField = useCallback(<K extends keyof ExpenseFormState>(field: K, value: ExpenseFormState[K]) => {
    setExpense(prev => ({ ...prev, [field]: value }));
  }, []);
  const resetExpense = useCallback(() => setExpense({ ...DEFAULT_EXPENSE, targetProjectId: initialProjectId }), [initialProjectId]);

  // ── Invoice ──
  const [invoice, setInvoice] = useState<InvoiceFormState>(DEFAULT_INVOICE);
  const addInvoiceItem = useCallback(() => {
    setInvoice(prev => ({ ...prev, items: [...prev.items, { description: '', quantity: 1, price: '' as any }] }));
  }, []);
  const updateInvoiceItem = useCallback((index: number, field: keyof InvoiceItem, value: any) => {
    setInvoice(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }, []);
  const deleteInvoiceItem = useCallback((index: number) => {
    setInvoice(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }, []);
  const setInvoiceField = useCallback(<K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => {
    setInvoice(prev => ({ ...prev, [field]: value }));
  }, []);
  const resetInvoice = useCallback(() => setInvoice({ ...DEFAULT_INVOICE, items: [{ description: '', quantity: 1, price: 0 }] }), []);

  // ── Quote ──
  const [quote, setQuote] = useState<QuoteFormState>({ ...DEFAULT_QUOTE_BASE, clientPhone: initialPhone });
  const addQuoteItem = useCallback(() => {
    setQuote(prev => ({ ...prev, items: [...prev.items, { description: '', quantity: 1, price: 0 }] }));
  }, []);
  const addProductToQuote = useCallback((product: Product) => {
    setQuote(prev => ({
      ...prev,
      items: [...prev.items, {
        description: product.name,
        quantity: 1,
        price: product.price,
        image: product.image,
        images: product.image ? [product.image] : undefined,
      }],
      showProductPicker: false,
    }));
  }, []);
  const updateQuoteItem = useCallback((index: number, field: keyof QuoteItem, value: any) => {
    setQuote(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }, []);
  const updateQuoteItemPrice = useCallback((index: number, value: string) => {
    setQuote(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], price: parseMoney(value) };
      return { ...prev, items };
    });
  }, []);
  const deleteQuoteItem = useCallback((index: number) => {
    setQuote(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }, []);
  const addQuoteItemImages = useCallback((index: number, newImages: string[]) => {
    setQuote(prev => {
      const items = [...prev.items];
      const currentItem = items[index];
      const currentImages = currentItem.images || (currentItem.image ? [currentItem.image] : []);
      items[index] = { ...currentItem, images: [...currentImages, ...newImages], image: undefined };
      return { ...prev, items };
    });
  }, []);
  const removeQuoteItemImage = useCallback((itemIndex: number, imageIndex: number) => {
    setQuote(prev => {
      const items = [...prev.items];
      const currentItem = items[itemIndex];
      if (currentItem.images) {
        const updatedImages = currentItem.images.filter((_, idx) => idx !== imageIndex);
        items[itemIndex] = { ...currentItem, images: updatedImages.length > 0 ? updatedImages : undefined };
      }
      return { ...prev, items };
    });
  }, []);
  const updateQuoteItemImage = useCallback((index: number, url: string) => {
    setQuote(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], image: url };
      return { ...prev, items };
    });
  }, []);
  const setQuoteField = useCallback(<K extends keyof QuoteFormState>(field: K, value: QuoteFormState[K]) => {
    setQuote(prev => ({ ...prev, [field]: value }));
  }, []);
  const resetQuote = useCallback((contactPhone?: string) => {
    setQuote({ ...DEFAULT_QUOTE_BASE, clientPhone: contactPhone || initialPhone, items: [{ description: '', quantity: 1, price: 0 }] });
  }, [initialPhone]);

  const setQuoteMode = useCallback((mode: QuoteMode) => {
    setQuote(prev => ({ ...prev, mode }));
  }, []);
  const addCarpentrySection = useCallback((category: CarpentryCategoryKey) => {
    setQuote(prev => ({ ...prev, sections: [...prev.sections, createCarpentrySection(category)] }));
  }, []);
  const removeCarpentrySection = useCallback((sectionId: string) => {
    setQuote(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== sectionId) }));
  }, []);
  const addCarpentryItem = useCallback((sectionId: string, groupId: string) => {
    setQuote(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          groups: section.groups.map(group => {
            if (group.id !== groupId) return group;
            const config = { defaultUnit: group.items[0]?.unit || 'UND' as const };
            return { ...group, items: [...group.items, createBlankCarpentryItem(config.defaultUnit)] };
          }),
        };
      }),
    }));
  }, []);
  const updateCarpentryItem = useCallback((sectionId: string, groupId: string, itemId: string, field: keyof CarpentryLineItem, value: any) => {
    setQuote(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          groups: section.groups.map(group => {
            if (group.id !== groupId) return group;
            return {
              ...group,
              items: group.items.map(item => {
                if (item.id !== itemId) return item;
                const updated = { ...item, [field]: value };
                // Ancho/Alto -> medida en m² automáticamente para ítems M2.
                if ((field === 'width' || field === 'height') && updated.unit === 'M2') {
                  updated.measure = computeM2FromDimensions(updated.width, updated.height);
                }
                return updated;
              }),
            };
          }),
        };
      }),
    }));
  }, []);
  const removeCarpentryItem = useCallback((sectionId: string, groupId: string, itemId: string) => {
    setQuote(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          groups: section.groups.map(group => {
            if (group.id !== groupId) return group;
            return { ...group, items: group.items.filter(i => i.id !== itemId) };
          }),
        };
      }),
    }));
  }, []);

  // ── Collection ──
  const [collection, setCollection] = useState<CollectionFormState>({
    amount: '', concept: '', directedTo: initialClientName, nit: '', selectedAccount: '', selectedProject: '',
  });
  const setCollectionField = useCallback(<K extends keyof CollectionFormState>(field: K, value: CollectionFormState[K]) => {
    setCollection(prev => ({ ...prev, [field]: value }));
  }, []);
  const resetCollection = useCallback((clientName: string) => {
    setCollection({ amount: '', concept: '', directedTo: clientName, nit: '', selectedAccount: '', selectedProject: '' });
  }, []);

  // ── Receipt ──
  const [receipt, setReceipt] = useState<ReceiptFormState>(DEFAULT_RECEIPT);
  const setReceiptField = useCallback(<K extends keyof ReceiptFormState>(field: K, value: ReceiptFormState[K]) => {
    setReceipt(prev => ({ ...prev, [field]: value }));
  }, []);
  const resetReceipt = useCallback(() => setReceipt(DEFAULT_RECEIPT), []);

  // ── Modal visibility ──
  const [modals, setModals] = useState<ModalVisibility>(DEFAULT_MODALS);
  const openModal = useCallback((modal: keyof ModalVisibility) => {
    setModals(prev => ({ ...prev, [modal]: true }));
  }, []);
  const closeModal = useCallback((modal: keyof ModalVisibility) => {
    setModals(prev => ({ ...prev, [modal]: false }));
  }, []);

  // ── Payment confirmation ──
  const [pendingPayment, setPendingPayment] = useState<{ id: string; type: string; metadata: any } | null>(null);

  // ── QR preview ──
  const [qrPreviewData, setQrPreviewData] = useState<{ qrUrl: string; metadata: any } | null>(null);

  // ── Copy state ──
  const [copiedText, setCopiedText] = useState<string | null>(null);

  return {
    expense, setExpenseField, resetExpense,
    invoice, addInvoiceItem, updateInvoiceItem, deleteInvoiceItem, setInvoiceField, resetInvoice,
    quote, addQuoteItem, addProductToQuote, updateQuoteItem, updateQuoteItemPrice,
    deleteQuoteItem, addQuoteItemImages, removeQuoteItemImage, updateQuoteItemImage, setQuoteField, resetQuote,
    setQuoteMode, addCarpentrySection, removeCarpentrySection, addCarpentryItem, updateCarpentryItem, removeCarpentryItem,
    collection, setCollectionField, resetCollection,
    receipt, setReceiptField, resetReceipt,
    modals, openModal, closeModal,
    pendingPayment, setPendingPayment,
    qrPreviewData, setQrPreviewData,
    copiedText, setCopiedText,
  };
};
