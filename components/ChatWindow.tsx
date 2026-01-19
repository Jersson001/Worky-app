
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Contact, Message, ProjectStage, Product, InvoiceItem, QuoteItem, Project, PaymentAccount, UserProfileData, FileMetadata } from '../types';
import { DocumentViewer } from './QuoteDocument';
import { uploadFileForChat, isFileTypeAllowed, isFileSizeValid, formatFileSize, getFileIcon, MAX_FILE_SIZE } from '../services/storageService';

interface ChatWindowProps {
  contact: Contact;
  allContacts: Contact[]; 
  messages: Message[];
  onSendMessage: (text: string, type?: 'text' | 'image' | 'file' | 'invoice' | 'product' | 'receipt' | 'quote' | 'collection_account' | 'expense_receipt', metadata?: any) => void;
  onUpdateStage: (stage: ProjectStage, projectId: string) => void;
  onAddExpense: (amount: number, description: string, targetProjectId?: string) => void;
  onUpdateProjectInfo: (value: number, name: string, projectId: string) => void;
  products: Product[];
  paymentAccounts: PaymentAccount[];
  onBack: () => void;
  activeAction?: 'invoice' | 'quote' | 'collection_account' | 'expense' | null;
  onClearAction?: () => void;
  onUpdateMessage: (messageId: string, metadata: any) => void;
  businessLogo?: string;
  digitalSignature?: string;
  userProfile?: UserProfileData | null;
  onOpenGantt?: (projectId?: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ contact, allContacts, messages, onSendMessage, onUpdateStage, onAddExpense, onUpdateProjectInfo, products, paymentAccounts, onBack, activeAction, onClearAction, onUpdateMessage, businessLogo, digitalSignature, userProfile, onOpenGantt }) => {
  const [inputText, setInputText] = useState('');
  
  // UI Toggles
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  
  // Header Menu State
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showSystemMessages, setShowSystemMessages] = useState(false); 
  
  // Info Panel Tabs
  const [infoTab, setInfoTab] = useState<'overview' | 'costs' | 'files' | 'documents'>('overview');
  const [selectedProjectForCosts, setSelectedProjectForCosts] = useState<string | null>(null);
  const [selectedProjectForDocuments, setSelectedProjectForDocuments] = useState<string>('all');
  
  // Editing State in Info Panel (Only for specific project now, complicated, simplified to just name)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [tempProjectValue, setTempProjectValue] = useState('');
  const [tempProjectName, setTempProjectName] = useState('');

  // Universal Document Viewer State
  const [viewingDocument, setViewingDocument] = useState<{ type: 'quote' | 'invoice' | 'receipt' | 'collection_account', data: any } | null>(null);
  
  // Payment Confirmation Modal State
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);
  const [pendingPaymentMessage, setPendingPaymentMessage] = useState<{ id: string, type: string, metadata: any } | null>(null);
  
  // Copy to clipboard state
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // QR Preview Modal State
  const [showQRPreview, setShowQRPreview] = useState(false);
  const [qrPreviewData, setQrPreviewData] = useState<{ qrUrl: string, metadata: any } | null>(null);

  // Forms State
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [targetProjectId, setTargetProjectId] = useState(''); 
  
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);
  const [selectedInvoiceProject, setSelectedInvoiceProject] = useState('');
  const [invoiceTaxType, setInvoiceTaxType] = useState<'none' | 'iva' | 'aiu'>('none');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([{ description: '', quantity: 1, price: 0 }]);
  const [quoteValidDays, setQuoteValidDays] = useState('15');
  const [quoteTaxType, setQuoteTaxType] = useState<'none' | 'percentage' | 'aiu'>('none');
  const [quoteTaxPercentage, setQuoteTaxPercentage] = useState('19');
  const [quoteAIUAdmin, setQuoteAIUAdmin] = useState('5');
  const [quoteAIUImprevistos, setQuoteAIUImprevistos] = useState('5');
  const [quoteAIUUtilidad, setQuoteAIUUtilidad] = useState('5');
  const [quoteAIUIva, setQuoteAIUIva] = useState('19');
  const [quoteClientAddress, setQuoteClientAddress] = useState('');
  const [quoteClientPhone, setQuoteClientPhone] = useState('');
  const [showProductPickerForQuote, setShowProductPickerForQuote] = useState(false);
  const [collectionAmount, setCollectionAmount] = useState('');
  const [collectionConcept, setCollectionConcept] = useState('');
  const [collectionDirectedTo, setCollectionDirectedTo] = useState(contact.clientName);
  const [collectionNit, setCollectionNit] = useState('');
  const [collectionSelectedAccount, setCollectionSelectedAccount] = useState('');
  const [selectedCollectionProject, setSelectedCollectionProject] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptConcept, setReceiptConcept] = useState('');
  const [receiptSelectedAccount, setReceiptSelectedAccount] = useState('');
  
  // Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const quoteImageInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const quoteCameraInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [currentQuoteItemIndex, setCurrentQuoteItemIndex] = useState<number | null>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  // File Upload State
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derived Financials (Global for Client)
  const totalGlobalValue = contact.projects.reduce((sum, p) => sum + p.value, 0);
  const totalGlobalExpenses = contact.projects.reduce((sum, p) => sum + p.expenses.reduce((s, e) => s + e.amount, 0), 0);
  const globalProfit = totalGlobalValue - totalGlobalExpenses;
  
  // Count only approved projects (those created from approved quotes)
  const approvedProjects = contact.projects.filter(p => (p as any).metadata?.quoteCode);
  // Remove duplicates by name (keep first occurrence)
  const uniqueApprovedProjects = approvedProjects.filter((project, index, self) => 
    index === self.findIndex(p => p.name === project.name)
  );
  const approvedProjectsCount = uniqueApprovedProjects.length;
  
  // Latest or main project name for display
  const displayProjectName = uniqueApprovedProjects.length > 0 ? uniqueApprovedProjects[0].name : 'Sin proyectos';
  const hasMultipleProjects = approvedProjectsCount > 1;

  // Flattened Expense History for Info Panel
  const allClientExpenses = useMemo(() => {
    return contact.projects
        .flatMap(p => p.expenses.map(e => ({ ...e, projectName: p.name })))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [contact.projects]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(scrollToBottom, [messages, showSystemMessages]);
  
  useEffect(() => {
    setCollectionDirectedTo(contact.clientName);
    // Default target project for expense to first one
    if (contact.projects.length > 0) {
        setTargetProjectId(contact.projects[0].id);
    }
    // Set contact phone in quote form when contact changes
    if (contact.phone) {
        setQuoteClientPhone(contact.phone);
    }
  }, [contact]);

  useEffect(() => {
    if (activeAction) {
        if (activeAction === 'invoice') setShowInvoiceModal(true);
        if (activeAction === 'quote') {
            setQuoteClientPhone(contact.phone || '');
            setShowQuoteModal(true);
        }
        if (activeAction === 'collection_account') setShowCollectionModal(true);
        if (activeAction === 'expense') setShowExpenseModal(true);
        if (onClearAction) onClearAction();
    }
  }, [activeAction, onClearAction, contact.phone]);

  const formatCurrency = (value: string | number) => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
    }
    const number = value.replace(/\D/g, '');
    if (!number) return '';
    return `$ ${Number(number).toLocaleString('es-CO')}`;
  };

  const handleCollectionAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setCollectionAmount(rawValue);
  };

  const handleExpenseAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setNewExpenseAmount(rawValue);
  };

  const handleReceiptAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setReceiptAmount(rawValue);
  };

  const handleInvoiceItemPriceChange = (idx: number, value: string) => {
    const rawValue = value.replace(/\D/g, '');
    handleUpdateInvoiceItem(idx, 'price', rawValue === '' ? '' : Number(rawValue));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Si es una imagen pequeña, usar base64 (comportamiento actual)
      if (file.type.startsWith('image/') && file.size < 2 * 1024 * 1024) { // < 2MB
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string;
          onSendMessage('', 'image', { url: imageUrl });
        };
        reader.readAsDataURL(file);
      } else {
        // Para imágenes grandes o archivos, usar Firebase Storage
        handleFileUpload(file);
      }
    }
    setShowAttachMenu(false);
    // Resetear el input
    if (e.target) e.target.value = '';
  };

  const handleFileUpload = async (file: File) => {
    // Validar tipo de archivo
    if (!isFileTypeAllowed(file)) {
      alert('Tipo de archivo no permitido. Se permiten: imágenes, PDFs, documentos de Office, archivos de texto y ZIP.');
      return;
    }

    // Validar tamaño
    if (!isFileSizeValid(file)) {
      alert(`El archivo es demasiado grande. Tamaño máximo: ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }

    setIsUploadingFile(true);
    setUploadProgress(0);

    try {
      // Subir archivo a Firebase Storage
      const result = await uploadFileForChat(file, contact.id);
      
      // Crear metadata del archivo
      const fileMetadata: FileMetadata = {
        url: result.url,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.fileType,
        downloadUrl: result.url
      };

      // Enviar mensaje con el archivo
      onSendMessage(file.name, 'file', fileMetadata);
      
      setUploadProgress(100);
    } catch (error: any) {
      console.error('Error subiendo archivo:', error);
      alert(`Error al subir archivo: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsUploadingFile(false);
      setUploadProgress(0);
      // Resetear el input
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    setShowAttachMenu(false);
    // Resetear el input
    if (e.target) e.target.value = '';
  };

  const handleQuoteImageUpload = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages: string[] = [];
      let loadedCount = 0;
      
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string;
          newImages.push(imageUrl);
          loadedCount++;
          
          // Cuando todas las imágenes estén cargadas, agregarlas al item
          if (loadedCount === files.length) {
            handleAddQuoteItemImages(idx, newImages);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Handlers ---
  const startEditingProject = (p: Project) => {
      setEditingProjectId(p.id);
      setTempProjectName(p.name);
      setTempProjectValue(p.value.toString());
  }

  const handleSaveInfo = () => {
      if (editingProjectId) {
        onUpdateProjectInfo(Number(tempProjectValue), tempProjectName, editingProjectId);
        setEditingProjectId(null);
      }
  };

  const handleSaveExpense = () => {
    if (newExpenseAmount && newExpenseDesc) {
      if ((contact.role === 'supplier' || contact.projects.length > 1) && !targetProjectId) {
          alert("Por favor selecciona a qué proyecto pertenece este gasto.");
          return;
      }
      
      console.log('Creando recibo de gasto...', {
        amount: Number(newExpenseAmount),
        desc: newExpenseDesc,
        projectId: targetProjectId
      });
      
      // Primero registrar el gasto en el proyecto
      onAddExpense(Number(newExpenseAmount), newExpenseDesc, targetProjectId || undefined);
      
      // Luego crear el recibo de gasto (solo aparece en documentos)
      const selectedProject = contact.projects.find(p => p.id === targetProjectId) || contact.projects[0];
      
      onSendMessage('', 'expense_receipt', {
        id: Date.now().toString(),
        number: `RG-${Math.floor(Math.random() * 10000)}`,
        amount: Number(newExpenseAmount),
        concept: newExpenseDesc,
        projectId: targetProjectId || (contact.projects[0]?.id),
        projectName: selectedProject?.name || '',
        date: new Date(),
        paymentMethod: 'Gasto Registrado'
      });
      
      console.log('Recibo de gasto creado');
      
      setNewExpenseAmount('');
      setNewExpenseDesc('');
      setShowExpenseModal(false);
    }
  };

  const handleAddInvoiceItem = () => setInvoiceItems([...invoiceItems, { description: '', quantity: 1, price: '' as any }]);
  const handleUpdateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...invoiceItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoiceItems(newItems);
  };
  const handleDeleteInvoiceItem = (index: number) => setInvoiceItems(invoiceItems.filter((_, i) => i !== index));

  const handleAddQuoteItem = () => setQuoteItems([...quoteItems, { description: '', quantity: 1, price: 0 }]);
  const handleAddProductToQuote = (product: Product) => {
      setQuoteItems([...quoteItems, { 
        description: product.name, 
        quantity: 1, 
        price: product.price, 
        image: product.image,
        images: product.image ? [product.image] : undefined
      }]);
      setShowProductPickerForQuote(false);
  };
  const handleUpdateQuoteItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuoteItems(newItems);
  };
  const handleUpdateQuoteItemPrice = (index: number, value: string) => {
    const rawValue = value.replace(/\D/g, '');
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], price: Number(rawValue) || 0 };
    setQuoteItems(newItems);
  };
  const handleDeleteQuoteItem = (index: number) => setQuoteItems(quoteItems.filter((_, i) => i !== index));
  const handleUpdateQuoteItemImage = (index: number, url: string) => {
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], image: url };
    setQuoteItems(newItems);
  };

  const handleAddQuoteItemImages = (index: number, newImages: string[]) => {
    const newItems = [...quoteItems];
    const currentItem = newItems[index];
    const currentImages = currentItem.images || (currentItem.image ? [currentItem.image] : []);
    newItems[index] = { 
      ...currentItem, 
      images: [...currentImages, ...newImages],
      image: undefined // Eliminar imagen única si existe
    };
    setQuoteItems(newItems);
  };

  const handleRemoveQuoteItemImage = (itemIndex: number, imageIndex: number) => {
    const newItems = [...quoteItems];
    const currentItem = newItems[itemIndex];
    if (currentItem.images) {
      const updatedImages = currentItem.images.filter((_, idx) => idx !== imageIndex);
      newItems[itemIndex] = { 
        ...currentItem, 
        images: updatedImages.length > 0 ? updatedImages : undefined
      };
      setQuoteItems(newItems);
    }
  };

  const handleSendInvoice = () => {
    const validItems = invoiceItems.filter(i => i.description && i.price > 0);
    if (validItems.length === 0) return;
    const subtotal = validItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    let total = subtotal;
    let taxDetails: any = { type: invoiceTaxType };
    
    if (invoiceTaxType === 'iva') {
      const iva = subtotal * 0.19;
      taxDetails.iva = iva;
      taxDetails.ivaPercentage = 19;
      total = subtotal + iva;
    } else if (invoiceTaxType === 'aiu') {
      const administracion = subtotal * 0.05;
      const imprevistos = subtotal * 0.05;
      const utilidad = subtotal * 0.05;
      const ivaUtilidad = utilidad * 0.19;
      taxDetails.administracion = administracion;
      taxDetails.imprevistos = imprevistos;
      taxDetails.utilidad = utilidad;
      taxDetails.ivaUtilidad = ivaUtilidad;
      total = subtotal + administracion + imprevistos + utilidad + ivaUtilidad;
    }
    
    const selectedProject = contact.projects.find(p => p.id === selectedInvoiceProject);
    
    onSendMessage('📄 Factura generada', 'invoice', {
      id: Date.now().toString(),
      number: `FAC-${Math.floor(Math.random() * 10000)}`,
      clientName: contact.clientName,
      items: validItems,
      subtotal: subtotal,
      taxDetails: taxDetails,
      total: total,
      projectName: selectedProject?.name || '',
      date: new Date(),
      status: 'Pending'
    });
    setShowInvoiceModal(false);
    setShowAttachMenu(false);
    setInvoiceItems([{ description: '', quantity: 1, price: 0 }]);
    setSelectedInvoiceProject('');
    setInvoiceTaxType('none');
  };

  const handleSendQuote = () => {
    const validItems = quoteItems.filter(i => i.description && i.price > 0);
    if (validItems.length === 0) return;
    const subtotal = validItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    let total = subtotal;
    let taxAmount = 0;
    
    if (quoteTaxType === 'percentage') {
      const percentage = parseFloat(quoteTaxPercentage) || 0;
      taxAmount = subtotal * (percentage / 100);
      total = subtotal + taxAmount;
    } else if (quoteTaxType === 'aiu') {
      // AIU: Porcentajes editables
      const adminPorcentaje = parseFloat(quoteAIUAdmin) || 5;
      const imprevistosPorcentaje = parseFloat(quoteAIUImprevistos) || 5;
      const utilidadPorcentaje = parseFloat(quoteAIUUtilidad) || 5;
      const ivaPorcentaje = parseFloat(quoteAIUIva) || 19;
      
      const administracion = subtotal * (adminPorcentaje / 100);
      const imprevistos = subtotal * (imprevistosPorcentaje / 100);
      const utilidad = subtotal * (utilidadPorcentaje / 100);
      const ivaUtilidad = utilidad * (ivaPorcentaje / 100);
      taxAmount = administracion + imprevistos + utilidad + ivaUtilidad;
      total = subtotal + taxAmount;
    }
    
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + parseInt(quoteValidDays || '15'));
    onSendMessage('📋 Cotización enviada', 'quote', {
      id: Date.now().toString(),
      number: `COT-${Math.floor(Math.random() * 10000)}`,
      clientName: contact.clientName,
      clientAddress: quoteClientAddress.trim() || undefined,
      clientPhone: quoteClientPhone.trim() || undefined,
      items: validItems,
      subtotal: subtotal,
      total: total,
      taxType: quoteTaxType,
      taxPercentage: quoteTaxType === 'percentage' ? parseFloat(quoteTaxPercentage) : undefined,
      taxAmount: (quoteTaxType === 'percentage' || quoteTaxType === 'aiu') ? taxAmount : undefined,
      aiuAdmin: quoteTaxType === 'aiu' ? parseFloat(quoteAIUAdmin) : undefined,
      aiuImprevistos: quoteTaxType === 'aiu' ? parseFloat(quoteAIUImprevistos) : undefined,
      aiuUtilidad: quoteTaxType === 'aiu' ? parseFloat(quoteAIUUtilidad) : undefined,
      aiuIva: quoteTaxType === 'aiu' ? parseFloat(quoteAIUIva) : undefined,
      date: new Date(),
      validUntil: validDate,
      status: 'pending' // pending, accepted, rejected
    });
    setShowQuoteModal(false);
    setShowAttachMenu(false);
    setQuoteItems([{ description: '', quantity: 1, price: 0 }]);
    setQuoteTaxType('none');
    setQuoteTaxPercentage('19');
    setQuoteAIUAdmin('5');
    setQuoteAIUImprevistos('5');
    setQuoteAIUUtilidad('5');
    setQuoteAIUIva('19');
                setQuoteClientAddress('');
                setQuoteClientPhone(contact.phone || '');
                setShowProductPickerForQuote(false);
  };

  const handleSendCollection = () => {
    if (!collectionAmount || !collectionConcept) return;
    
    const selectedAccount = collectionSelectedAccount === 'efectivo' ? null : paymentAccounts.find(acc => acc.id === collectionSelectedAccount);
    const selectedProject = contact.projects.find(p => p.id === selectedCollectionProject);
    
    onSendMessage('📨 Cuenta de Cobro enviada', 'collection_account', {
      id: Date.now().toString(),
      number: `CC-${Math.floor(Math.random() * 10000)}`,
      amount: Number(collectionAmount),
      concept: collectionConcept,
      directedTo: collectionDirectedTo,
      nit: collectionNit,
      bankName: collectionSelectedAccount === 'efectivo' ? 'Pago en Efectivo' : (selectedAccount?.bankName || ''),
      accountType: collectionSelectedAccount === 'efectivo' ? '' : (selectedAccount?.accountType || ''),
      accountNumber: collectionSelectedAccount === 'efectivo' ? '' : (selectedAccount?.accountNumber || ''),
      holderName: collectionSelectedAccount === 'efectivo' ? '' : (selectedAccount?.holderName || ''),
      projectName: selectedProject?.name || '',
      date: new Date()
    });
    setShowCollectionModal(false);
    setShowAttachMenu(false);
    setCollectionAmount('');
    setCollectionConcept('');
    setCollectionDirectedTo(contact.clientName);
    setCollectionNit('');
    setCollectionSelectedAccount('');
    setSelectedCollectionProject('');
  };

  const handleSendReceipt = () => {
    if (!receiptAmount || !receiptConcept) return;
    
    const selectedAccount = receiptSelectedAccount === 'efectivo' ? null : paymentAccounts.find(acc => acc.id === receiptSelectedAccount);
    
    // Si es proveedor, incluir el nombre del cliente en los metadatos
    const receiptMetadata: any = {
      id: Date.now().toString(),
      number: `RC-${Math.floor(Math.random() * 10000)}`,
      amount: Number(receiptAmount),
      concept: receiptConcept,
      date: new Date(),
      paymentMethod: receiptSelectedAccount === 'efectivo' ? 'Efectivo' : 'Transferencia',
      bankName: receiptSelectedAccount === 'efectivo' ? 'Pago en Efectivo' : (selectedAccount?.bankName || ''),
      accountType: receiptSelectedAccount === 'efectivo' ? '' : (selectedAccount?.accountType || ''),
      accountNumber: receiptSelectedAccount === 'efectivo' ? '' : (selectedAccount?.accountNumber || ''),
      holderName: receiptSelectedAccount === 'efectivo' ? '' : (selectedAccount?.holderName || ''),
      selectedAccountId: receiptSelectedAccount
    };
    
    // Si el contacto es proveedor, agregar información del cliente que recibe el recibo
    if (contact.role === 'supplier') {
      receiptMetadata.clientName = contact.clientName;
      receiptMetadata.fromSupplier = true;
    }
    
    onSendMessage(contact.role === 'supplier' ? '💰 Recibo de pago recibido' : '💰 Recibo de pago generado', 'receipt', receiptMetadata);
    setShowReceiptModal(false);
    setShowAttachMenu(false);
    setReceiptAmount('');
    setReceiptConcept('');
    setReceiptSelectedAccount('');
  };

  const handleConfirmPayment = () => {
    if (!pendingPaymentMessage) return;
    
    const message = messages.find(m => m.id === pendingPaymentMessage.id);
    if (message) {
      onUpdateMessage(pendingPaymentMessage.id, { ...message, isPaid: true, paidDate: new Date() });
    }
    
    setShowPaymentConfirmModal(false);
    setPendingPaymentMessage(null);
  };

  const handleCopyPaymentInfo = (metadata: any) => {
    let textToCopy = '';
    
    if (metadata.accountNumber) {
      textToCopy = `Banco: ${metadata.bankName || ''}\nTipo: ${metadata.accountType || ''}\nNúmero de cuenta: ${metadata.accountNumber}\nTitular: ${metadata.holderName || ''}\nMonto: ${formatCurrency(metadata.amount || metadata.total || 0)}`;
    } else {
      textToCopy = `Monto: ${formatCurrency(metadata.amount || metadata.total || 0)}`;
    }
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedText(metadata.number || 'info');
      setTimeout(() => setCopiedText(null), 2000);
    }).catch(err => {
      console.error('Error al copiar:', err);
    });
  };

  const filteredMessages = messages.filter(msg => {
    // Excluir gastos y recibos de gasto del chat (solo aparecen en documentos)
    if (msg.type === 'expense' || msg.type === 'expense_receipt') return false;
    // Filtrar mensajes de sistema según toggle
    return msg.metadata?.isSystem ? showSystemMessages : true;
  });

  return (
    <div className="flex-1 flex h-full relative">
      {viewingDocument && (
         <DocumentViewer 
            type={viewingDocument.type} 
            data={viewingDocument.data} 
            onClose={() => setViewingDocument(null)}
            businessLogo={businessLogo}
            digitalSignature={digitalSignature}
            contactPhone={contact.phone}
            userProfile={userProfile}
         />
      )}

      {/* Main Chat Column */}
      <div className="flex-1 flex flex-col h-full relative min-w-0" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
        
        {/* Chat Header - Modern Dark */}
        <div className="h-16 px-4 flex items-center justify-between flex-shrink-0 border-b border-slate-700/50 z-20 relative" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
          <div className="flex items-center cursor-pointer" onClick={() => setShowInfo(!showInfo)}>
             <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="md:hidden mr-3 text-slate-400 hover:text-white transition">
                <i className="fa-solid fa-arrow-left"></i>
             </button>
            <div className="relative">
                <img src={contact.avatar} alt={contact.clientName} className="w-10 h-10 rounded-full object-cover mr-3 shadow-lg border-2 border-slate-600" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-white font-semibold text-base">{contact.clientName}</h2>
              <span className="text-xs text-blue-400 font-medium truncate flex items-center gap-1">
                 {hasMultipleProjects && <span className="bg-blue-500/20 text-blue-400 px-1 rounded text-[9px] font-bold">{approvedProjectsCount}</span>}
                 <i className="fa-solid fa-briefcase text-[10px]"></i> {displayProjectName}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-slate-400">
             {/* Botón de Gantt para clientes con proyectos */}
             {onOpenGantt && contact.role === 'client' && contact.projects.length > 0 && (
               <button 
                 onClick={() => onOpenGantt(contact.projects[0]?.id)}
                 className="hover:text-blue-400 transition w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700/50"
                 title="Ver cronograma Gantt"
               >
                 <i className="fa-solid fa-chart-gantt text-lg"></i>
               </button>
             )}
             {/* Botón de Catálogo para proveedores - al lado del perfil */}
             {contact.role === 'supplier' && (
               <button 
                 onClick={() => setShowProductPicker(true)}
                 className="hover:text-blue-400 transition w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700/50"
                 title="Catálogo"
               >
                 <i className="fa-solid fa-store text-lg"></i>
               </button>
             )}
             <button className="hover:text-blue-400 transition w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700/50"><i className="fa-solid fa-magnifying-glass text-lg"></i></button>
             <div className="relative">
                <button 
                  className={`hover:text-blue-400 w-8 h-8 rounded-lg flex items-center justify-center transition ${showChatMenu ? 'bg-slate-700 text-blue-400' : ''}`}
                  onClick={() => setShowChatMenu(!showChatMenu)}
                >
                  <i className="fa-solid fa-ellipsis-vertical text-lg"></i>
                </button>
                {showChatMenu && (
                  <div className="absolute right-0 top-10 bg-slate-800 w-64 rounded-xl shadow-xl py-2 z-50 border border-slate-700/50 animate-scale-in origin-top-right backdrop-blur-xl">
                      <button onClick={() => { setShowInfo(true); setShowChatMenu(false); }} className="w-full text-left px-4 py-3 text-slate-300 hover:bg-slate-700/50 hover:text-white text-sm flex items-center gap-3 transition">
                        <i className="fa-solid fa-circle-info text-blue-400"></i>
                        Info. del contacto
                      </button>
                      {onOpenGantt && contact.projects.length > 0 && (
                        <button 
                          onClick={() => { 
                            setShowChatMenu(false); 
                            onOpenGantt(contact.projects[0]?.id); 
                          }} 
                          className="w-full text-left px-4 py-3 text-slate-300 hover:bg-blue-500/10 hover:text-white text-sm flex items-center gap-3 transition"
                        >
                          <i className="fa-solid fa-chart-gantt text-violet-400"></i>
                          Ver cronograma Gantt
                        </button>
                      )}
                      <button onClick={() => { setShowChatMenu(false); onBack(); }} className="w-full text-left px-4 py-3 text-rose-400 hover:bg-rose-500/10 text-sm font-medium flex items-center gap-3 transition">
                        <i className="fa-solid fa-xmark"></i>
                        Cerrar chat
                      </button>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Financial Bar (For Clients) */}
        {showFinancials && contact.role === 'client' && (
            <div className="bg-slate-800/80 backdrop-blur-lg border-b border-slate-700/50 px-4 py-3 flex justify-between items-center text-xs z-10 animate-slide-in-top">
                <div className="flex gap-6 flex-1">
                    <div className="flex flex-col">
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Venta Total</span>
                        <span className="text-white font-bold text-sm">{formatCurrency(totalGlobalValue)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Total Gastos</span>
                        <span className="text-rose-400 font-bold text-sm">{formatCurrency(totalGlobalExpenses)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Ganancia</span>
                        <span className={`font-black text-sm ${globalProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(globalProfit)}
                        </span>
                    </div>
                </div>
                <button 
                   onClick={() => setShowExpenseModal(true)} 
                   className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-2 rounded-lg text-xs flex items-center gap-2 border border-rose-500/30 transition font-bold"
                >
                   <i className="fa-solid fa-circle-minus"></i> Registrar Gasto
                </button>
            </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 relative" style={{ background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(30,41,59,0.95) 100%)' }}>
          {filteredMessages.map((msg) => {
             const isSystem = msg.metadata?.isSystem;
             return (
                <div key={msg.id} className={`flex mb-4 ${isSystem ? 'justify-center' : msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  {isSystem ? (
                      <div className="bg-amber-500/10 text-amber-400 text-xs px-4 py-2 rounded-full shadow-lg border border-amber-500/20 my-2 font-medium tracking-wide flex items-center gap-2 backdrop-blur-sm">
                          {msg.text.includes('Gasto') ? <i className="fa-solid fa-money-bill-wave"></i> : <i className="fa-solid fa-check-circle"></i>}
                          {msg.text}
                      </div>
                  ) : (
                      <div 
                        className={`max-w-[85%] md:max-w-[65%] px-4 py-3 rounded-2xl text-sm shadow-lg relative group ${
                          msg.sender === 'me' 
                            ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-br-none shadow-blue-500/20' 
                            : 'bg-slate-800/80 backdrop-blur-sm text-slate-200 rounded-bl-none border border-slate-700/50'
                        }`}
                      >
                        {/* --- DOCUMENT BUBBLES --- */}
                        {msg.type === 'invoice' && msg.metadata && (
                          <div className="bg-slate-700/50 backdrop-blur-sm text-slate-200 p-3 rounded-xl mb-1 overflow-hidden w-64 shadow-lg border border-slate-600/50 relative">
                            {/* Status Badge */}
                            <div className="absolute top-2 right-2 z-10">
                              {msg.isPaid ? (
                                <span className="bg-emerald-500 text-white text-[9px] font-bold uppercase px-2 py-1 rounded-full shadow-lg">
                                  Pagada
                                </span>
                              ) : (
                                <span className="bg-amber-500 text-amber-950 text-[9px] font-bold uppercase px-2 py-1 rounded-full shadow-lg">
                                  Pendiente
                                </span>
                              )}
                            </div>
                            
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2 border-dashed">
                              <div className="pr-16">
                                <span className="font-bold text-indigo-600 text-[10px] tracking-widest block uppercase">Factura</span>
                                <span className="text-[10px] text-slate-400 font-mono">{msg.metadata.number}</span>
                                {msg.metadata.projectName && <div className="text-xs text-slate-700 font-semibold mt-1">{msg.metadata.projectName}</div>}
                              </div>
                              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600"><i className="fa-solid fa-file-invoice-dollar"></i></div>
                            </div>
                            {msg.isPaid && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 flex items-center gap-2">
                                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                <div className="text-[10px] text-emerald-700">
                                  <div className="font-bold">PAGADO</div>
                                  <div>{msg.paidDate ? new Date(msg.paidDate).toLocaleDateString() : ''}</div>
                                </div>
                              </div>
                            )}
                            <div className="text-xs space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                              <div className="text-slate-400 text-[10px] uppercase font-bold">Cliente: {msg.metadata.clientName}</div>
                              {msg.metadata.items.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between border-b border-slate-50 pb-1">
                                  <span><span className="font-bold">{item.quantity}</span> x {item.description}</span>
                                  <span className="font-medium text-slate-600">${(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-slate-100 mt-3 pt-2 flex justify-between font-bold text-sm text-slate-900 mb-3">
                              <span>Total</span>
                              <span>{formatCurrency(msg.metadata.total)}</span>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setViewingDocument({ type: 'invoice', data: msg.metadata })} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                                  <i className="fa-solid fa-eye"></i> Ver
                              </button>
                              {!msg.isPaid ? (
                                <button 
                                  onClick={() => {
                                    setPendingPaymentMessage({ id: msg.id, type: msg.type, metadata: msg.metadata });
                                    setShowPaymentConfirmModal(true);
                                  }} 
                                  className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-amber-600 transition flex items-center justify-center gap-2"
                                >
                                  <i className="fa-solid fa-clock"></i> Por Pagar
                                </button>
                              ) : (
                                <div className="flex-1 bg-slate-100 text-slate-500 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                                  <i className="fa-solid fa-paper-plane"></i> Comprobante Enviado
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Quote Bubble */}
                        {msg.type === 'quote' && msg.metadata && (
                           <div className={`bg-white text-slate-800 p-3 rounded-xl mb-1 w-64 shadow-sm border-2 ${msg.metadata.status === 'accepted' ? 'border-emerald-400' : 'border-slate-100'}`}>
                              <div className="flex justify-between items-center border-b border-teal-100 pb-2 mb-2">
                                 <div className="flex-1">
                                     <span className="font-bold text-teal-600 text-[10px] uppercase block">
                                       Cotización
                                     </span>
                                     <div className="text-[10px] text-slate-400">{msg.metadata.number}</div>
                                     {msg.metadata.items?.[0]?.description && <div className="text-xs text-slate-700 font-semibold mt-1">{msg.metadata.items[0].description}</div>}
                                 </div>
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.metadata.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' : 'bg-teal-50 text-teal-600'}`}>
                                     {msg.metadata.status === 'accepted' ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-file-contract"></i>}
                                 </div>
                              </div>
                              <div className="font-bold text-center text-slate-900 text-lg mb-3">{formatCurrency(msg.metadata.total)}</div>
                              
                              <div className="text-[10px] text-center text-slate-400 mb-3">Válido hasta: {new Date(msg.metadata.validUntil).toLocaleDateString()}</div>
                              
                              <button onClick={() => setViewingDocument({ type: 'quote', data: msg.metadata })} className="w-full bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition mb-2">
                                  Ver Detalle
                              </button>

                              {/* Status Actions */}
                              {msg.metadata.status === 'accepted' ? (
                                  <div className="w-full bg-emerald-50 text-emerald-700 py-2 rounded-lg text-xs font-bold border border-emerald-100 flex items-center justify-center gap-1">
                                      <i className="fa-solid fa-check-circle"></i> Aprobada & Proyecto Creado
                                  </div>
                              ) : msg.metadata.status === 'rejected' ? (
                                  <div className="w-full bg-rose-50 text-rose-700 py-2 rounded-lg text-xs font-bold border border-rose-100 flex items-center justify-center gap-1">
                                      <i className="fa-solid fa-circle-xmark"></i> Rechazada
                                  </div>
                              ) : msg.sender === 'me' ? (
                                  <div className="flex gap-2">
                                      <button 
                                        onClick={() => onUpdateMessage(msg.id, { metadata: { ...msg.metadata, status: 'rejected', approved: false } })}
                                        className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 py-2 rounded-lg text-xs font-bold transition border border-rose-100"
                                      >
                                          Rechazar
                                      </button>
                                      <button 
                                        onClick={() => onUpdateMessage(msg.id, { metadata: { ...msg.metadata, status: 'accepted', approved: true } })}
                                        className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-2 rounded-lg text-xs font-bold transition border border-emerald-100"
                                      >
                                          Aprobar
                                      </button>
                                  </div>
                              ) : (
                                  <div className="w-full bg-slate-50 text-slate-500 py-2 rounded-lg text-xs font-bold border border-slate-100 flex items-center justify-center gap-1">
                                      <i className="fa-solid fa-clock"></i> Pendiente de Aprobación
                                  </div>
                              )}
                           </div>
                        )}

                        {/* Collection Account Bubble */}
                        {msg.type === 'collection_account' && msg.metadata && (
                            <div className="bg-white text-slate-800 p-3 rounded-xl mb-1 w-64 shadow-sm border border-slate-200 relative">
                                {/* Status Badge */}
                                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shadow-sm ${
                                    msg.isPaid 
                                        ? 'bg-emerald-500 text-white' 
                                        : 'bg-amber-400 text-amber-900'
                                }`}>
                                    {msg.isPaid ? 'Pagada' : 'Pendiente'}
                                </div>
                                <div className="flex justify-between items-center border-b border-orange-100 pb-2 mb-2 pr-16">
                                    <div>
                                        <span className="font-bold text-orange-600 text-[10px] uppercase">Cuenta de Cobro</span>
                                        <div className="text-[10px] text-slate-400">{msg.metadata.number}</div>
                                        {msg.metadata.projectName && <div className="text-xs text-slate-700 font-semibold mt-1">{msg.metadata.projectName}</div>}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600"><i className="fa-solid fa-file-invoice"></i></div>
                                </div>
                                {msg.isPaid && (
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                    <div className="text-[10px] text-emerald-700">
                                      <div className="font-bold">PAGADO</div>
                                      <div>{msg.paidDate ? new Date(msg.paidDate).toLocaleDateString() : ''}</div>
                                    </div>
                                  </div>
                                )}
                                <div className="text-center mb-3">
                                    <div className="text-xs text-slate-500 mb-1">{msg.metadata.concept}</div>
                                    <div className="font-bold text-slate-900 text-lg mb-3">{formatCurrency(msg.metadata.amount)}</div>
                                    
                                    {/* Quick Payment Section with QR */}
                                    {!msg.isPaid && (
                                        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg p-3 mb-2 shadow-sm">
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-2">Escanea para pagar</p>
                                                <div className="flex justify-center mb-2">
                                                    <div 
                                                        onClick={() => {
                                                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://ejemplo-pago.com')}`;
                                                            setQrPreviewData({ qrUrl, metadata: msg.metadata });
                                                            setShowQRPreview(true);
                                                        }}
                                                        className="cursor-pointer hover:scale-105 transition-transform"
                                                    >
                                                        <img 
                                                            src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https://ejemplo-pago.com" 
                                                            alt="QR Code" 
                                                            className="w-24 h-24 rounded-lg shadow-md border-2 border-white"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-center gap-2 text-[9px] text-slate-500 mb-2">
                                                    {msg.metadata.bankName && (
                                                        <span className="font-semibold">{msg.metadata.bankName}</span>
                                                    )}
                                                    {msg.metadata.accountNumber && (
                                                        <>
                                                            {msg.metadata.bankName && <span>•</span>}
                                                            <span className="font-semibold">{msg.metadata.accountNumber}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleCopyPaymentInfo(msg.metadata)}
                                                    className="w-full bg-orange-600 text-white py-1.5 rounded-lg text-[10px] font-bold hover:bg-orange-700 transition flex items-center justify-center gap-1.5"
                                                >
                                                    {copiedText === msg.metadata.number ? (
                                                        <>
                                                            <i className="fa-solid fa-check"></i> Copiado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fa-solid fa-copy"></i> Copiar datos de pago
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => setViewingDocument({ type: 'collection_account', data: msg.metadata })} className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-orange-700 transition">Ver</button>
                                  {!msg.isPaid && (
                                    <button 
                                      onClick={() => {
                                        setPendingPaymentMessage({ id: msg.id, type: msg.type, metadata: msg.metadata });
                                        setShowPaymentConfirmModal(true);
                                      }} 
                                      className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-amber-600 transition flex items-center justify-center gap-1"
                                    >
                                      <i className="fa-solid fa-clock"></i> Por Pagar
                                    </button>
                                  )}
                                </div>
                            </div>
                        )}

                         {/* Receipt Bubble */}
                         {msg.type === 'receipt' && msg.metadata && (
                            <div className="bg-white text-slate-800 p-3 rounded-xl mb-1 w-64 shadow-sm border border-slate-200 relative">
                                {/* Status Badge */}
                                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shadow-sm ${
                                    msg.isPaid 
                                        ? 'bg-emerald-500 text-white' 
                                        : 'bg-amber-400 text-amber-900'
                                }`}>
                                    {msg.isPaid ? 'Pagado' : 'Pendiente'}
                                </div>
                                <div className="flex justify-between items-center border-b border-emerald-100 pb-2 mb-2 pr-16">
                                    <div>
                                        <span className="font-bold text-emerald-600 text-[10px] uppercase">
                                          {contact.role === 'supplier' ? 'Recibo de Pago' : 'Recibo de Caja'}
                                        </span>
                                        <div className="text-[10px] text-slate-400">{msg.metadata.number}</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><i className="fa-solid fa-money-bills"></i></div>
                                </div>
                                {msg.isPaid && (
                                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                    <div className="text-[10px] text-emerald-700">
                                      <div className="font-bold">PAGADO</div>
                                      <div>{msg.metadata.number}</div>
                                      <div>{msg.paidDate ? new Date(msg.paidDate).toLocaleDateString() : ''}</div>
                                    </div>
                                  </div>
                                )}
                                <div className="text-center mb-2">
                                    <div className="text-xs text-slate-500 mb-1">{msg.metadata.concept}</div>
                                    <div className="font-bold text-slate-900 text-lg mb-3">{formatCurrency(msg.metadata.amount)}</div>
                                    
                                    {/* Información diferente según el rol */}
                                    {contact.role === 'supplier' && (
                                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2 text-[10px] text-blue-700">
                                        <div className="font-bold mb-1">Recibido de: {msg.metadata.clientName || contact.clientName}</div>
                                        {msg.metadata.paymentMethod && (
                                          <div>Método: {msg.metadata.paymentMethod}</div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Quick Payment Section with QR - Solo para clientes */}
                                    {contact.role !== 'supplier' && !msg.isPaid && msg.metadata.selectedAccountId && msg.metadata.selectedAccountId !== 'efectivo' && (
                                        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-lg p-3 mb-2 shadow-sm">
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Escanea para pagar</p>
                                                <div className="flex justify-center mb-2">
                                                    {(() => {
                                                        const qrData = msg.metadata.accountNumber 
                                                            ? `https://bancolombia.com/pagar?cuenta=${msg.metadata.accountNumber}&valor=${msg.metadata.amount}`
                                                            : `https://nequi.com/pagar?valor=${msg.metadata.amount}`;
                                                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
                                                        return (
                                                            <div 
                                                                onClick={() => {
                                                                    setQrPreviewData({ qrUrl, metadata: msg.metadata });
                                                                    setShowQRPreview(true);
                                                                }}
                                                                className="cursor-pointer hover:scale-105 transition-transform"
                                                            >
                                                                <img 
                                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`}
                                                                    alt="QR Code" 
                                                                    className="w-24 h-24 rounded-lg shadow-md border-2 border-white"
                                                                />
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex items-center justify-center gap-2 text-[9px] text-slate-500 mb-2">
                                                    {msg.metadata.bankName && (
                                                        <span className="font-semibold">{msg.metadata.bankName}</span>
                                                    )}
                                                    {msg.metadata.accountNumber && (
                                                        <>
                                                            {msg.metadata.bankName && <span>•</span>}
                                                            <span className="font-semibold">{msg.metadata.accountNumber}</span>
                                                        </>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleCopyPaymentInfo(msg.metadata)}
                                                    className="w-full bg-emerald-600 text-white py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
                                                >
                                                    {copiedText === msg.metadata.number ? (
                                                        <>
                                                            <i className="fa-solid fa-check"></i> Copiado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fa-solid fa-copy"></i> Copiar datos de pago
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => setViewingDocument({ type: 'receipt', data: msg.metadata })} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition">Ver</button>
                                  {!msg.isPaid && (
                                    <button 
                                      onClick={() => {
                                        setPendingPaymentMessage({ id: msg.id, type: msg.type, metadata: msg.metadata });
                                        setShowPaymentConfirmModal(true);
                                      }} 
                                      className="flex-1 bg-amber-500 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-amber-600 transition flex items-center justify-center gap-1"
                                    >
                                      <i className="fa-solid fa-clock"></i> Por Pagar
                                    </button>
                                  )}
                                </div>
                            </div>
                        )}
                        
                        {/* Image Content */}
                        {msg.type === 'image' && msg.metadata?.url && (
                            <div className="rounded-lg overflow-hidden max-w-xs">
                                <img src={msg.metadata.url} alt="Imagen enviada" className="w-full h-auto" />
                            </div>
                        )}
                        
                        {/* File Content */}
                        {msg.type === 'file' && msg.metadata && (
                            <div className="bg-white border border-slate-200 rounded-lg p-4 max-w-xs hover:shadow-md transition">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <i className={`fa-solid ${getFileIcon(msg.metadata.fileType)} text-indigo-600 text-xl`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-800 text-sm truncate" title={msg.metadata.fileName}>
                                            {msg.metadata.fileName}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {formatFileSize(msg.metadata.fileSize)}
                                        </p>
                                        <a
                                            href={msg.metadata.url || msg.metadata.downloadUrl}
                                            download={msg.metadata.fileName}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-medium"
                                        >
                                            <i className="fa-solid fa-download"></i>
                                            Descargar
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Text Content */}
                        {!['invoice', 'quote', 'receipt', 'collection_account', 'product', 'image', 'file'].includes(msg.type) && (
                            <div className="whitespace-pre-wrap leading-relaxed px-1 break-all">{msg.text}</div>
                        )}
                        
                        <div className={`text-[10px] float-right mt-1 ml-2 flex items-center gap-1 opacity-70 ${msg.sender === 'me' ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {msg.sender === 'me' && <i className="fa-solid fa-check-double"></i>}
                        </div>
                      </div>
                  )}
                </div>
             );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer / Input */}
        <div className="min-h-[68px] px-4 py-3 flex items-center gap-3 z-20 border-t border-slate-700/50 backdrop-blur-lg" style={{ background: 'linear-gradient(135deg, rgba(30,58,95,0.95) 0%, rgba(15,23,42,0.98) 100%)' }}>
          <button className="text-slate-500 text-xl hover:text-blue-400 transition">
            <i className="fa-regular fa-face-smile"></i>
          </button>
          
          <div className="relative">
            <button 
               onClick={() => { setShowAttachMenu(!showAttachMenu); setShowProductPicker(false); }}
               className={`text-xl transition w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-700/50 ${showAttachMenu ? 'text-blue-400 rotate-45 bg-blue-500/20' : 'text-slate-400'}`}
            >
               <i className="fa-solid fa-plus"></i>
            </button>
            
            {/* Popup Menu */}
            {showAttachMenu && (
               <div className="absolute bottom-16 left-0 flex flex-col gap-3 animate-scale-in z-50 ml-1">
                  {(() => {
                    // Botones diferentes según el rol del contacto
                    if (contact.role === 'supplier') {
                      // Para proveedores: Cotización (para que el proveedor cotice), Recibo, Gasto
                      return [
                          { icon: 'fa-file-contract', color: 'bg-gradient-to-r from-teal-500 to-emerald-500', label: 'Cotizar', action: () => { setQuoteClientPhone(contact.phone || ''); setShowQuoteModal(true); } },
                          { icon: 'fa-money-bills', color: 'bg-gradient-to-r from-emerald-500 to-green-500', label: 'Recibo', action: () => setShowReceiptModal(true) },
                          { icon: 'fa-circle-minus', color: 'bg-gradient-to-r from-rose-500 to-red-500', label: 'Registrar Nuevo Gasto', action: () => setShowExpenseModal(true) },
                      ];
                    } else {
                      // Para clientes: Cotización, Cuenta de Cobro, Factura, Recibo, Catálogo, Gasto, Archivo
                      return [
                          { icon: 'fa-file-contract', color: 'bg-gradient-to-r from-teal-500 to-emerald-500', label: 'Cotización', action: () => { setQuoteClientPhone(contact.phone || ''); setShowQuoteModal(true); } },
                          { icon: 'fa-file-invoice', color: 'bg-gradient-to-r from-orange-500 to-amber-500', label: 'Cuenta de Cobro', action: () => setShowCollectionModal(true) },
                          { icon: 'fa-file-invoice-dollar', color: 'bg-gradient-to-r from-blue-500 to-violet-500', label: 'Factura', action: () => setShowInvoiceModal(true) },
                          { icon: 'fa-money-bills', color: 'bg-gradient-to-r from-emerald-500 to-green-500', label: 'Recibo', action: () => setShowReceiptModal(true) },
                          { icon: 'fa-store', color: 'bg-gradient-to-r from-cyan-500 to-blue-500', label: 'Catálogo', action: () => setShowProductPicker(true) },
                          { icon: 'fa-circle-minus', color: 'bg-gradient-to-r from-rose-500 to-red-500', label: 'Registrar Nuevo Gasto', action: () => setShowExpenseModal(true) },
                          { icon: 'fa-paperclip', color: 'bg-gradient-to-r from-purple-500 to-violet-500', label: 'Archivo', action: () => documentInputRef.current?.click() },
                      ];
                    }
                  })().map((item, i) => (
                      <div key={i} className="flex items-center gap-3 group cursor-pointer" onClick={() => { item.action(); setShowAttachMenu(false); }}>
                        <div className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center shadow-lg hover:scale-110 transition text-white border-2 border-slate-700 ring-2 ring-slate-800`}>
                            <i className={`fa-solid ${item.icon} text-lg`}></i>
                        </div>
                        <span className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg border border-slate-700 font-bold hidden group-hover:block whitespace-nowrap animate-fade-in">
                            {item.label}
                        </span>
                      </div>
                  ))}
               </div>
            )}
          </div>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-slate-800/50 text-white text-sm rounded-xl px-4 py-3 outline-none border border-slate-700/50 focus:bg-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition placeholder-slate-500"
          />

          {/* Camera button */}
          <div className="relative">
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  const file = target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      onSendMessage(event.target?.result as string, 'text');
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="text-slate-400 text-xl hover:text-blue-400 transition"
            >
              <i className="fa-solid fa-camera"></i>
            </button>
          </div>
          
          {inputText ? (
            <button onClick={handleSend} className="text-white bg-gradient-to-r from-blue-600 to-violet-600 w-10 h-10 rounded-full flex items-center justify-center hover:from-blue-500 hover:to-violet-500 transition shadow-lg shadow-blue-500/30">
               <i className="fa-solid fa-paper-plane text-sm"></i>
            </button>
          ) : (
            <button className="text-slate-400 text-xl hover:text-blue-400 transition">
              <i className="fa-solid fa-microphone"></i>
            </button>
          )}
        </div>

        {/* --- MODALS (Modern Clean Light) --- */}
        {[
            { show: showExpenseModal, close: () => setShowExpenseModal(false), title: 'Registrar Gasto', icon: 'fa-circle-minus', color: 'text-rose-500', content: (
                <>
                   {(contact.role === 'supplier' || contact.projects.length > 0) && (
                        <div className="mb-3">
                             <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Asignar a Proyecto</label>
                             <select value={targetProjectId} onChange={(e) => setTargetProjectId(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                                 {contact.role === 'supplier' ? (
                                    <>
                                        <option value="">-- Seleccionar --</option>
                                        {allContacts.filter(c => c.role === 'client').map(c => 
                                            c.projects.map(p => <option key={p.id} value={p.id}>{c.clientName} - {p.name}</option>)
                                        )}
                                    </>
                                 ) : (
                                    contact.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                 )}
                             </select>
                        </div>
                   )}
                   <input type="text" placeholder="Descripción" value={newExpenseDesc} onChange={(e) => setNewExpenseDesc(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                   <div className="relative mb-4">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 font-semibold">$</span>
                      <input type="text" placeholder="Valor" value={newExpenseAmount ? Number(newExpenseAmount).toLocaleString('es-CO') : ''} onChange={handleExpenseAmountChange} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 pl-8 outline-none border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                   </div>
                   <button onClick={handleSaveExpense} className="w-full bg-rose-500 text-white py-3 rounded-lg font-bold shadow hover:bg-rose-600 transition">Registrar Gasto</button>
                </>
            )},
            // ... (Other modals same as before, truncated for brevity as no logic changed inside them except potentially quote item selection)
            { show: showQuoteModal, close: () => {
                setShowQuoteModal(false);
                setQuoteTaxType('none');
                setQuoteTaxPercentage('19');
                setQuoteAIUAdmin('5');
                setQuoteAIUImprevistos('5');
                setQuoteAIUUtilidad('5');
                setQuoteAIUIva('19');
                setQuoteClientAddress('');
                setQuoteClientPhone(contact.phone || '');
                setShowProductPickerForQuote(false);
            }, title: contact.role === 'supplier' ? 'Enviar Cotización' : 'Nueva Cotización', icon: 'fa-file-contract', color: 'text-teal-500', content: (
                <div className="max-h-[70vh] overflow-y-auto custom-scrollbar px-1">
                    <div className="mb-4">
                        <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Vigencia (Días)</label>
                        <select value={quoteValidDays} onChange={e => setQuoteValidDays(e.target.value)} className="w-full bg-slate-50 p-2 rounded border border-slate-200 text-sm">
                            <option value="7">7 Días</option>
                            <option value="15">15 Días</option>
                            <option value="30">30 Días</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="text-xs text-slate-400 font-bold uppercase block mb-1">Datos del Cliente (Opcional)</label>
                        <input 
                            type="text" 
                            value={quoteClientAddress}
                            onChange={(e) => setQuoteClientAddress(e.target.value)}
                            placeholder="Dirección"
                            className="w-full bg-slate-50 p-2 rounded border border-slate-200 text-sm mb-2"
                        />
                        <input 
                            type="tel" 
                            value={quoteClientPhone}
                            onChange={(e) => setQuoteClientPhone(e.target.value)}
                            placeholder="Teléfono"
                            className="w-full bg-slate-50 p-2 rounded border border-slate-200 text-sm"
                        />
                    </div>
                    {quoteItems.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3 relative group">
                            <button onClick={() => handleDeleteQuoteItem(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
                            <input type="text" placeholder="Producto / Servicio" value={item.description} onChange={e => handleUpdateQuoteItem(idx, 'description', e.target.value)} className="w-full bg-white p-2 rounded border border-slate-200 text-sm mb-2 font-medium" />
                            <div className="flex gap-2">
                                <input type="number" placeholder="Cant." value={item.quantity} onChange={e => handleUpdateQuoteItem(idx, 'quantity', Number(e.target.value))} className="w-20 bg-white p-2 rounded border border-slate-200 text-sm text-center" />
                                <input type="text" placeholder="Precio Unit." value={item.price > 0 ? formatCurrency(item.price) : ''} onChange={e => handleUpdateQuoteItemPrice(idx, e.target.value)} className="flex-1 bg-white p-2 rounded border border-slate-200 text-sm font-semibold" />
                            </div>
                             <div className="mt-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.multiple = true;
                                            input.capture = 'environment' as any;
                                            input.onchange = (e) => handleQuoteImageUpload(e as any, idx);
                                            input.click();
                                        }}
                                        className="flex-1 bg-purple-50 text-purple-600 py-2 rounded border border-purple-200 text-xs font-bold hover:bg-purple-100 transition"
                                    >
                                        <i className="fa-solid fa-camera mr-1"></i> Cámara
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.multiple = true;
                                            input.onchange = (e) => handleQuoteImageUpload(e as any, idx);
                                            input.click();
                                        }}
                                        className="flex-1 bg-pink-50 text-pink-600 py-2 rounded border border-pink-200 text-xs font-bold hover:bg-pink-100 transition"
                                    >
                                        <i className="fa-solid fa-image mr-1"></i> Galería
                                    </button>
                                </div>
                                {(item.images && item.images.length > 0) && (
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {item.images.map((imageUrl, imgIdx) => (
                                            <div key={imgIdx} className="relative">
                                                <img src={imageUrl} className="w-full h-24 rounded border border-slate-200 object-cover" />
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveQuoteItemImage(idx, imgIdx)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                                >
                                                    <i className="fa-solid fa-times"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Compatibilidad: mostrar imagen única si existe (para items antiguos) */}
                                {(!item.images || item.images.length === 0) && item.image && (
                                    <div className="relative inline-block mt-2">
                                        <img src={item.image} className="w-full h-24 rounded border border-slate-200 object-cover" />
                                        <button 
                                            type="button"
                                            onClick={() => handleUpdateQuoteItemImage(idx, '')}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            <i className="fa-solid fa-times"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-2 mb-4">
                        <button onClick={handleAddQuoteItem} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"><i className="fa-solid fa-plus mr-1"></i> Item Vacío</button>
                        <button onClick={() => setShowProductPickerForQuote(true)} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100"><i className="fa-solid fa-box mr-1"></i> Catálogo</button>
                    </div>
                    {showProductPickerForQuote && (
                        <div className="mb-4 bg-white border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto">
                            <div className="text-xs font-bold text-slate-400 mb-2 px-2 uppercase">Seleccionar Producto</div>
                            {products.map(p => (
                                <div key={p.id} onClick={() => handleAddProductToQuote(p)} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                    <img src={p.image} className="w-8 h-8 rounded object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-bold truncate">{p.name}</div>
                                        <div className="text-[10px] text-slate-500">${p.price.toLocaleString()}</div>
                                    </div>
                                    <i className="fa-solid fa-plus text-indigo-500"></i>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Tax Options */}
                    <div className="mb-4">
                        <label className="text-xs text-slate-400 font-bold uppercase block mb-2">Impuestos</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
                            <button 
                                type="button"
                                onClick={() => setQuoteTaxType('none')}
                                className={`flex-1 py-2 text-xs font-bold rounded transition ${quoteTaxType === 'none' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                No aplica
                            </button>
                            <button 
                                type="button"
                                onClick={() => setQuoteTaxType('percentage')}
                                className={`flex-1 py-2 text-xs font-bold rounded transition ${quoteTaxType === 'percentage' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Porcentaje
                            </button>
                            <button 
                                type="button"
                                onClick={() => setQuoteTaxType('aiu')}
                                className={`flex-1 py-2 text-xs font-bold rounded transition ${quoteTaxType === 'aiu' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                AIU
                            </button>
                        </div>
                        {quoteTaxType === 'percentage' && (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    value={quoteTaxPercentage}
                                    onChange={(e) => setQuoteTaxPercentage(e.target.value)}
                                    placeholder="19"
                                    className="w-24 bg-white p-2 rounded border border-slate-200 text-sm"
                                />
                                <span className="text-sm text-slate-600">%</span>
                            </div>
                        )}
                        {quoteTaxType === 'aiu' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                <p className="font-semibold mb-2 text-xs text-blue-700">AIU (Administración, Imprevistos, Utilidad)</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-blue-600 block mb-1">Administración (%)</label>
                                        <input 
                                            type="number" 
                                            value={quoteAIUAdmin}
                                            onChange={(e) => setQuoteAIUAdmin(e.target.value)}
                                            className="w-full bg-white p-2 rounded border border-blue-200 text-xs"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-blue-600 block mb-1">Imprevistos (%)</label>
                                        <input 
                                            type="number" 
                                            value={quoteAIUImprevistos}
                                            onChange={(e) => setQuoteAIUImprevistos(e.target.value)}
                                            className="w-full bg-white p-2 rounded border border-blue-200 text-xs"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-blue-600 block mb-1">Utilidad (%)</label>
                                        <input 
                                            type="number" 
                                            value={quoteAIUUtilidad}
                                            onChange={(e) => setQuoteAIUUtilidad(e.target.value)}
                                            className="w-full bg-white p-2 rounded border border-blue-200 text-xs"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-blue-600 block mb-1">IVA sobre Utilidad (%)</label>
                                        <input 
                                            type="number" 
                                            value={quoteAIUIva}
                                            onChange={(e) => setQuoteAIUIva(e.target.value)}
                                            className="w-full bg-white p-2 rounded border border-blue-200 text-xs"
                                            step="0.1"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Total Summary */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 space-y-2">
                        {(() => {
                            const subtotal = quoteItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                            let total = subtotal;
                            let taxAmount = 0;
                            
                            if (quoteTaxType === 'percentage') {
                                const percentage = parseFloat(quoteTaxPercentage) || 0;
                                taxAmount = subtotal * (percentage / 100);
                                total = subtotal + taxAmount;
                            } else if (quoteTaxType === 'aiu') {
                                // AIU: Porcentajes editables
                                const adminPorcentaje = parseFloat(quoteAIUAdmin) || 5;
                                const imprevistosPorcentaje = parseFloat(quoteAIUImprevistos) || 5;
                                const utilidadPorcentaje = parseFloat(quoteAIUUtilidad) || 5;
                                const ivaPorcentaje = parseFloat(quoteAIUIva) || 19;
                                
                                const administracion = subtotal * (adminPorcentaje / 100);
                                const imprevistos = subtotal * (imprevistosPorcentaje / 100);
                                const utilidad = subtotal * (utilidadPorcentaje / 100);
                                const ivaUtilidad = utilidad * (ivaPorcentaje / 100);
                                taxAmount = administracion + imprevistos + utilidad + ivaUtilidad;
                                total = subtotal + taxAmount;
                            }
                            
                            return (
                                <>
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>Subtotal:</span>
                                        <span>${subtotal.toLocaleString()}</span>
                                    </div>
                                    {quoteTaxType !== 'none' && taxAmount > 0 && (
                                        <>
                                            {quoteTaxType === 'aiu' ? (
                                                <>
                                                    {(() => {
                                                        const adminPorcentaje = parseFloat(quoteAIUAdmin) || 5;
                                                        const imprevistosPorcentaje = parseFloat(quoteAIUImprevistos) || 5;
                                                        const utilidadPorcentaje = parseFloat(quoteAIUUtilidad) || 5;
                                                        const ivaPorcentaje = parseFloat(quoteAIUIva) || 19;
                                                        
                                                        const administracion = subtotal * (adminPorcentaje / 100);
                                                        const imprevistos = subtotal * (imprevistosPorcentaje / 100);
                                                        const utilidad = subtotal * (utilidadPorcentaje / 100);
                                                        const ivaUtilidad = utilidad * (ivaPorcentaje / 100);
                                                        
                                                        return (
                                                            <>
                                                                <div className="flex justify-between text-sm text-slate-600">
                                                                    <span>Administración ({adminPorcentaje}%):</span>
                                                                    <span>${administracion.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm text-slate-600">
                                                                    <span>Imprevistos ({imprevistosPorcentaje}%):</span>
                                                                    <span>${imprevistos.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm text-slate-600">
                                                                    <span>Utilidad ({utilidadPorcentaje}%):</span>
                                                                    <span>${utilidad.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm text-slate-600">
                                                                    <span>IVA sobre Utilidad ({ivaPorcentaje}%):</span>
                                                                    <span>${ivaUtilidad.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between text-sm font-semibold text-slate-700 border-t border-slate-200 pt-1 mt-1">
                                                                    <span>Total AIU:</span>
                                                                    <span>${taxAmount.toLocaleString()}</span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </>
                                            ) : (
                                                <div className="flex justify-between text-sm text-slate-600">
                                                    <span>
                                                        {quoteTaxType === 'percentage' ? `Impuesto (${quoteTaxPercentage}%):` : 'Impuesto:'}
                                                    </span>
                                                    <span>${taxAmount.toLocaleString()}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-2">
                                        <span>Total:</span>
                                        <span>${total.toLocaleString()}</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                    <button onClick={handleSendQuote} className="w-full bg-teal-500 text-white py-3 rounded-lg font-bold shadow hover:bg-teal-600 transition">Enviar Cotización</button>
                </div>
            )},
            { show: showInvoiceModal, close: () => setShowInvoiceModal(false), title: 'Crear Factura', icon: 'fa-file-invoice-dollar', color: 'text-indigo-500', content: (
                <div className="max-h-[70vh] overflow-y-auto custom-scrollbar px-1">
                    {uniqueApprovedProjects.length > 0 && (
                      <div className="mb-3">
                         <label className="text-xs text-slate-600 font-bold mb-1 block">Proyecto</label>
                         <select value={selectedInvoiceProject} onChange={(e) => setSelectedInvoiceProject(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 outline-none border border-slate-200 focus:border-indigo-500 mb-3">
                            <option value="">-- Seleccionar proyecto --</option>
                            {uniqueApprovedProjects.map(p => (
                               <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                         </select>
                      </div>
                    )}
                    {invoiceItems.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3 relative">
                             <button onClick={() => handleDeleteInvoiceItem(idx)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
                            <input type="text" placeholder="Descripción" value={item.description} onChange={e => handleUpdateInvoiceItem(idx, 'description', e.target.value)} className="w-full bg-white p-2 rounded border border-slate-200 text-sm mb-2 font-medium" />
                            <div className="flex gap-2">
                                <input type="number" placeholder="Cant." value={item.quantity} onChange={e => handleUpdateInvoiceItem(idx, 'quantity', Number(e.target.value))} className="w-20 bg-white p-2 rounded border border-slate-200 text-sm text-center" />
                                <div className="flex-1 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">$</span>
                                    <input type="text" placeholder="Precio Unit." value={item.price ? Number(item.price).toLocaleString('es-CO') : ''} onChange={e => handleInvoiceItemPriceChange(idx, e.target.value)} className="w-full bg-white p-2 pl-7 rounded border border-slate-200 text-sm" />
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={handleAddInvoiceItem} className="w-full py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 mb-4"><i className="fa-solid fa-plus mr-1"></i> Agregar Item</button>
                    
                    <div className="mb-4">
                        <label className="text-xs text-slate-600 font-bold mb-1 block">Tipo de Impuesto</label>
                        <select value={invoiceTaxType} onChange={(e) => setInvoiceTaxType(e.target.value as any)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 outline-none border border-slate-200 focus:border-indigo-500">
                            <option value="none">Sin impuestos</option>
                            <option value="iva">IVA (19%)</option>
                            <option value="aiu">AIU (A:5% + I:5% + U:5% + IVA U:19%)</option>
                        </select>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 space-y-2">
                        {(() => {
                            const subtotal = invoiceItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                            let total = subtotal;
                            
                            if (invoiceTaxType === 'iva') {
                                const iva = subtotal * 0.19;
                                total = subtotal + iva;
                                return (
                                    <>
                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span>Subtotal:</span>
                                            <span>${subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span>IVA (19%):</span>
                                            <span>${iva.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-2">
                                            <span>Total:</span>
                                            <span>${total.toLocaleString()}</span>
                                        </div>
                                    </>
                                );
                            } else if (invoiceTaxType === 'aiu') {
                                const administracion = subtotal * 0.05;
                                const imprevistos = subtotal * 0.05;
                                const utilidad = subtotal * 0.05;
                                const ivaUtilidad = utilidad * 0.19;
                                total = subtotal + administracion + imprevistos + utilidad + ivaUtilidad;
                                return (
                                    <>
                                        <div className="flex justify-between text-sm text-slate-600">
                                            <span>Subtotal:</span>
                                            <span>${subtotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Administración (5%):</span>
                                            <span>${administracion.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Imprevistos (5%):</span>
                                            <span>${imprevistos.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Utilidad (5%):</span>
                                            <span>${utilidad.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>IVA Utilidad (19%):</span>
                                            <span>${ivaUtilidad.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-2">
                                            <span>Total:</span>
                                            <span>${total.toLocaleString()}</span>
                                        </div>
                                    </>
                                );
                            } else {
                                return (
                                    <div className="flex justify-between text-sm font-bold text-slate-800">
                                        <span>Total:</span>
                                        <span>${subtotal.toLocaleString()}</span>
                                    </div>
                                );
                            }
                        })()}
                    </div>
                    <button onClick={handleSendInvoice} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow hover:bg-indigo-700 transition">Generar Factura</button>
                </div>
            )},
            { show: showCollectionModal, close: () => setShowCollectionModal(false), title: 'Cuenta de Cobro', icon: 'fa-file-invoice', color: 'text-orange-500', content: (
                <>
                   {uniqueApprovedProjects.length > 0 && (
                      <div className="mb-3">
                         <label className="text-xs text-slate-600 font-bold mb-1 block">Proyecto</label>
                         <select value={selectedCollectionProject} onChange={(e) => setSelectedCollectionProject(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 outline-none border border-slate-200 focus:border-orange-500">
                            <option value="">-- Seleccionar proyecto --</option>
                            {uniqueApprovedProjects.map(p => (
                               <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                         </select>
                      </div>
                   )}
                   <input type="text" placeholder="Dirigido a (Nombre)" value={collectionDirectedTo} onChange={e => setCollectionDirectedTo(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500" />
                   <input type="text" placeholder="NIT / CC" value={collectionNit} onChange={e => setCollectionNit(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500" />
                   <textarea placeholder="Concepto (Ej. Honorarios mes Marzo)" value={collectionConcept} onChange={e => setCollectionConcept(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500 h-24 resize-none"></textarea>
                   <input type="text" placeholder="Valor" value={formatCurrency(collectionAmount)} onChange={handleCollectionAmountChange} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500 font-semibold text-lg" />
                   <div className="text-xs font-semibold text-slate-600 mb-2 mt-1">Cuenta para Consignación</div>
                   <select value={collectionSelectedAccount} onChange={e => setCollectionSelectedAccount(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-4 outline-none border border-slate-200 focus:border-indigo-500">
                     <option value="">Seleccionar cuenta...</option>
                     <option value="efectivo">💵 Pago en Efectivo</option>
                     {paymentAccounts.map(acc => (
                       <option key={acc.id} value={acc.id}>
                         {acc.bankName} - {acc.accountType} - {acc.accountNumber}
                       </option>
                     ))}
                   </select>
                   <button onClick={handleSendCollection} className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold shadow hover:bg-orange-600 transition">Crear Cuenta Cobro</button>
                </>
            )},
            { show: showReceiptModal, close: () => setShowReceiptModal(false), title: contact.role === 'supplier' ? 'Enviar Recibo de Pago' : 'Recibo de Caja', icon: 'fa-money-bills', color: 'text-emerald-500', content: (
                <>
                   {uniqueApprovedProjects.length > 0 && (
                      <div className="mb-3">
                         <label className="text-xs text-slate-600 font-bold mb-1 block">Proyecto</label>
                         <select className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 outline-none border border-slate-200 focus:border-emerald-500">
                            <option value="">-- Seleccionar proyecto --</option>
                            {uniqueApprovedProjects.map(p => (
                               <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                         </select>
                      </div>
                   )}
                   <textarea placeholder="Concepto del pago" value={receiptConcept} onChange={e => setReceiptConcept(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-3 outline-none border border-slate-200 focus:border-indigo-500 h-24 resize-none"></textarea>
                   <div className="relative mb-3">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 font-semibold">$</span>
                      <input type="text" placeholder="Valor" value={receiptAmount ? Number(receiptAmount).toLocaleString('es-CO') : ''} onChange={handleReceiptAmountChange} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 pl-8 outline-none border border-slate-200 focus:border-indigo-500" />
                   </div>
                   <div className="text-xs font-semibold text-slate-600 mb-2">Método de Pago</div>
                   <select value={receiptSelectedAccount} onChange={e => setReceiptSelectedAccount(e.target.value)} className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-4 outline-none border border-slate-200 focus:border-indigo-500">
                     <option value="">Seleccionar método de pago...</option>
                     <option value="efectivo">💵 Pago en Efectivo</option>
                     {paymentAccounts.map(acc => (
                       <option key={acc.id} value={acc.id}>
                         {acc.bankName} - {acc.accountType} - {acc.accountNumber}
                       </option>
                     ))}
                   </select>
                   <button onClick={handleSendReceipt} className="w-full bg-emerald-500 text-white py-3 rounded-lg font-bold shadow hover:bg-emerald-600 transition">
                     {contact.role === 'supplier' ? 'Enviar Recibo' : 'Generar Recibo'}
                   </button>
                </>
            )},
            { show: showProductPicker, close: () => setShowProductPicker(false), title: 'Catálogo', icon: 'fa-store', color: 'text-blue-500', content: (
                <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">
                    {products.map(p => (
                        <div key={p.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition cursor-pointer" onClick={() => { onSendMessage('', 'product', p); setShowProductPicker(false); setShowAttachMenu(false); }}>
                            <div className="h-24 bg-slate-100 flex items-center justify-center overflow-hidden">
                                <img src={p.image} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-3">
                                <div className="font-bold text-xs text-slate-800 truncate">{p.name}</div>
                                <div className="text-indigo-600 font-bold text-sm mt-1">${p.price.toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )},
        ].map((m, i) => m.show && (
            <div key={i} className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
                <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
                    <button onClick={m.close} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
                    <h3 className="text-slate-800 font-bold text-lg mb-6 flex items-center gap-2"><i className={`fa-solid ${m.icon} ${m.color}`}></i> {m.title}</h3>
                    {m.content}
                </div>
            </div>
        ))}

        {/* QR Preview Modal */}
        {showQRPreview && qrPreviewData && (
          <div className="absolute inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
              <button 
                onClick={() => {
                  setShowQRPreview(false);
                  setQrPreviewData(null);
                }} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center z-10"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
              <div className="text-center">
                <h3 className="text-slate-800 font-bold text-lg mb-4 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-qrcode text-indigo-500"></i> Código QR de Pago
                </h3>
                <div className="bg-white p-4 rounded-xl mb-4 inline-block shadow-lg">
                  <img 
                    src={qrPreviewData.qrUrl}
                    alt="QR Code Preview" 
                    className="w-64 h-64 rounded-lg"
                  />
                </div>
                {qrPreviewData.metadata.bankName && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 text-left">
                    <div className="text-xs text-slate-600 space-y-1">
                      {qrPreviewData.metadata.bankName && (
                        <div><span className="font-bold">Banco:</span> {qrPreviewData.metadata.bankName}</div>
                      )}
                      {qrPreviewData.metadata.accountType && (
                        <div><span className="font-bold">Tipo:</span> {qrPreviewData.metadata.accountType}</div>
                      )}
                      {qrPreviewData.metadata.accountNumber && (
                        <div><span className="font-bold">Cuenta:</span> {qrPreviewData.metadata.accountNumber}</div>
                      )}
                      {qrPreviewData.metadata.holderName && (
                        <div><span className="font-bold">Titular:</span> {qrPreviewData.metadata.holderName}</div>
                      )}
                      {(qrPreviewData.metadata.amount || qrPreviewData.metadata.total) && (
                        <div><span className="font-bold">Monto:</span> {formatCurrency(qrPreviewData.metadata.amount || qrPreviewData.metadata.total || 0)}</div>
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleCopyPaymentInfo(qrPreviewData.metadata)}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  {copiedText === qrPreviewData.metadata.number ? (
                    <>
                      <i className="fa-solid fa-check"></i> Copiado
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-copy"></i> Copiar datos de pago
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Confirmation Modal */}
        {showPaymentConfirmModal && pendingPaymentMessage && (
          <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
              <button 
                onClick={() => {
                  setShowPaymentConfirmModal(false);
                  setPendingPaymentMessage(null);
                }} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
              <h3 className="text-slate-800 font-bold text-lg mb-6 flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-500"></i> Confirmar Pago
              </h3>
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-2">
                    {pendingPaymentMessage.type === 'invoice' && 'Factura'}
                    {pendingPaymentMessage.type === 'collection_account' && 'Cuenta de Cobro'}
                    {pendingPaymentMessage.type === 'receipt' && 'Recibo de Caja'}
                  </div>
                  <div className="text-xs text-slate-400 mb-1">
                    {pendingPaymentMessage.metadata?.number && `#${pendingPaymentMessage.metadata.number}`}
                  </div>
                  {pendingPaymentMessage.metadata?.amount && (
                    <div className="text-lg font-bold text-slate-800">
                      {formatCurrency(pendingPaymentMessage.metadata.amount)}
                    </div>
                  )}
                  {pendingPaymentMessage.metadata?.total && (
                    <div className="text-lg font-bold text-slate-800">
                      {formatCurrency(pendingPaymentMessage.metadata.total)}
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-600 text-center">
                  ¿Confirmas que este documento ha sido pagado?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPaymentConfirmModal(false);
                      setPendingPaymentMessage(null);
                    }}
                    className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-300 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="flex-1 bg-emerald-500 text-white py-3 rounded-lg font-bold hover:bg-emerald-600 transition flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-check"></i> Confirmar Pago
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel - Clean Light */}
      {showInfo && (
        <div className="w-[350px] bg-white border-l border-slate-200 flex flex-col h-full absolute right-0 z-30 shadow-2xl animate-slide-in">
           <div className="h-16 bg-white px-4 flex items-center gap-4 border-b border-slate-200 flex-shrink-0">
              <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-xmark text-lg"></i></button>
              <h3 className="text-slate-800 font-bold">Info. del contacto</h3>
           </div>
           {/* Info Content */}
           <div className="p-8 flex flex-col items-center bg-slate-50 border-b border-slate-100 mb-2">
                <img src={contact.avatar} className="w-24 h-24 rounded-full object-cover mb-4 shadow-md border-4 border-white" />
                <h2 className="text-slate-800 text-xl font-bold">{contact.clientName}</h2>
                <p className="text-slate-500 text-sm mt-1">{contact.phone}</p>
           </div>

           {/* Tab Navigation */}
           <div className="flex border-b border-slate-200 bg-white px-4">
              <button 
                onClick={() => setInfoTab('overview')} 
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${infoTab === 'overview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fa-solid fa-info-circle mr-1"></i> Resumen
              </button>
              <button 
                onClick={() => setInfoTab('costs')} 
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${infoTab === 'costs' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fa-solid fa-scale-balanced mr-1"></i> Balance
              </button>
              <button 
                onClick={() => setInfoTab('documents')} 
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${infoTab === 'documents' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fa-solid fa-file-invoice mr-1"></i> Documentos
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-6">{infoTab === 'overview' && (
               <>
               {/* Income Summary */}
               <div className="mb-6">
                  <h4 className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-4">
                      Ingresos Recibidos
                  </h4>
                  {(() => {
                      const paidInvoices = messages.filter(m => m.type === 'invoice' && m.isPaid);
                      const paidCollections = messages.filter(m => m.type === 'collection_account' && m.isPaid);
                      const totalInvoices = paidInvoices.reduce((sum, m) => sum + (m.metadata?.total || 0), 0);
                      const totalCollections = paidCollections.reduce((sum, m) => sum + (m.metadata?.amount || 0), 0);
                      const totalIncome = totalInvoices + totalCollections;
                      
                      if (totalIncome === 0) {
                          return <div className="text-slate-400 text-sm italic">Sin pagos recibidos.</div>;
                      }
                      
                      return (
                          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                  <div>
                                      <span className="block text-emerald-600 font-bold uppercase text-[9px] mb-1">Facturas Pagadas</span>
                                      <span className="font-bold text-slate-800 text-lg">{formatCurrency(totalInvoices)}</span>
                                      <span className="block text-slate-400 text-[10px] mt-1">{paidInvoices.length} factura{paidInvoices.length !== 1 ? 's' : ''}</span>
                                  </div>
                                  <div className="text-right">
                                      <span className="block text-emerald-600 font-bold uppercase text-[9px] mb-1">Cuentas de Cobro</span>
                                      <span className="font-bold text-slate-800 text-lg">{formatCurrency(totalCollections)}</span>
                                      <span className="block text-slate-400 text-[10px] mt-1">{paidCollections.length} cuenta{paidCollections.length !== 1 ? 's' : ''}</span>
                                  </div>
                              </div>
                              <div className="border-t border-emerald-200 pt-3">
                                  <span className="block text-emerald-600 font-bold uppercase text-[9px] mb-1">Total Ingresos</span>
                                  <span className="font-bold text-emerald-600 text-2xl">{formatCurrency(totalIncome)}</span>
                              </div>
                          </div>
                      );
                  })()}
               </div>

               {/* Projects List */}
               <div className="mb-6">
                  <h4 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 flex justify-between items-center">
                      Proyectos Activos ({approvedProjectsCount})
                  </h4>
                  
                  {approvedProjectsCount === 0 ? (
                      <div className="text-slate-400 text-sm italic">Sin proyectos asignados.</div>
                  ) : (
                      <div className="space-y-4">
                        {uniqueApprovedProjects.map(p => {
                            const pExpenses = p.expenses.reduce((s, e) => s + e.amount, 0);
                            return (
                                <div key={p.id} className="bg-slate-50 rounded-xl border border-slate-100 p-4 relative group">
                                     {editingProjectId === p.id ? (
                                         <div className="mb-2 space-y-2">
                                            <input type="text" value={tempProjectName} onChange={e => setTempProjectName(e.target.value)} className="w-full bg-white text-slate-800 p-2 rounded border border-slate-300 text-sm" />
                                            <input type="number" value={tempProjectValue} onChange={e => setTempProjectValue(e.target.value)} className="w-full bg-white text-slate-800 p-2 rounded border border-slate-300 text-sm" />
                                            <button onClick={handleSaveInfo} className="w-full bg-indigo-600 text-white py-1 rounded text-xs font-bold">Guardar</button>
                                         </div>
                                     ) : (
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                                            <button onClick={() => startEditingProject(p)} className="text-slate-300 hover:text-indigo-600"><i className="fa-solid fa-pen text-xs"></i></button>
                                        </div>
                                     )}
                                     
                                     {!editingProjectId && (
                                         <div className="space-y-3">
                                             {/* Saldo del Proyecto */}
                                             <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                                 <div className="text-[10px] font-bold uppercase text-indigo-600 mb-2">Saldo del Proyecto</div>
                                                 {(() => {
                                                     // Calcular abonos recibidos (facturas y cuentas de cobro pagadas)
                                                     const projectPayments = messages.filter(m => 
                                                         ((m.type === 'invoice' && m.isPaid) || (m.type === 'collection_account' && m.isPaid) || (m.type === 'receipt' && m.isPaid)) &&
                                                         m.metadata?.projectName === p.name
                                                     );
                                                     const totalPayments = projectPayments.reduce((sum, m) => sum + (m.metadata?.total || m.metadata?.amount || 0), 0);
                                                     const projectBalance = p.value - totalPayments;
                                                     
                                                     return (
                                                         <>
                                                             <div className="flex justify-between items-center mb-2">
                                                                 <span className="text-xs text-slate-600">Costo del Proyecto:</span>
                                                                 <span className="text-sm font-bold text-slate-800">{formatCurrency(p.value)}</span>
                                                             </div>
                                                             <div className="flex justify-between items-center mb-2">
                                                                 <span className="text-xs text-slate-600">Abonos Recibidos:</span>
                                                                 <span className="text-sm font-bold text-emerald-600">-{formatCurrency(totalPayments)}</span>
                                                             </div>
                                                             <div className="pt-2 border-t border-indigo-300 flex justify-between items-center">
                                                                 <span className="text-xs font-bold text-slate-700">Saldo Pendiente:</span>
                                                                 <span className={`text-base font-bold ${projectBalance > 0 ? 'text-rose-600' : projectBalance === 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                                     {formatCurrency(projectBalance)}
                                                                 </span>
                                                             </div>
                                                         </>
                                                     );
                                                 })()}
                                             </div>
                                             
                                             {/* Información adicional */}
                                             <div className="grid grid-cols-2 gap-2 text-xs">
                                                 <div>
                                                     <span className="block text-slate-400 font-bold uppercase text-[9px]">Venta</span>
                                                     <span className="font-bold text-slate-700">{formatCurrency(p.value)}</span>
                                                 </div>
                                                 <div className="text-right">
                                                     <span className="block text-slate-400 font-bold uppercase text-[9px]">Gastos</span>
                                                     <span className="font-bold text-rose-500">{formatCurrency(pExpenses)}</span>
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                </div>
                            );
                        })}
                      </div>
                  )}
               </div>
               </>
           )}

           {infoTab === 'costs' && (
               <div>
                  <h4 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4">Balance por Proyecto</h4>
                  
                  {uniqueApprovedProjects.length === 0 ? (
                      <div className="text-slate-400 text-sm italic text-center py-8">Sin proyectos asignados.</div>
                  ) : uniqueApprovedProjects.length === 1 ? (
                      // Si solo hay un proyecto, mostrar su balance directamente
                      <div>
                          {(() => {
                              const project = uniqueApprovedProjects[0];
                              const projectIncome = messages.filter(m => 
                                  ((m.type === 'invoice' && m.isPaid) || (m.type === 'collection_account' && m.isPaid)) &&
                                  m.metadata?.projectName === project.name
                              ).reduce((sum, m) => sum + (m.metadata?.total || m.metadata?.amount || 0), 0);
                              const projectExpenses = project.expenses.reduce((s, e) => s + e.amount, 0);
                              const balance = projectIncome - projectExpenses;
                              
                              return (
                                  <>
                                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
                                          <div className="font-bold text-slate-800 text-sm mb-3">{project.name}</div>
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                              <div>
                                                  <span className="text-slate-500">Ingresos: </span>
                                                  <span className="font-bold text-emerald-500">{formatCurrency(projectIncome)}</span>
                                              </div>
                                              <div>
                                                  <span className="text-slate-500">Gastos: </span>
                                                  <span className="font-bold text-rose-500">{formatCurrency(projectExpenses)}</span>
                                              </div>
                                          </div>
                                          <div className="mt-2 pt-2 border-t border-indigo-300">
                                              <span className="text-slate-500 text-xs">Balance: </span>
                                              <span className={`font-bold text-sm ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                  {formatCurrency(balance)}
                                              </span>
                                          </div>
                                      </div>
                                      
                                      <div className="space-y-3">
                                          <h5 className="text-emerald-600 text-xs font-bold uppercase mt-4 mb-2">Ingresos</h5>
                                          {(() => {
                                              const incomes = messages.filter(m => 
                                                  ((m.type === 'invoice' && m.isPaid) || (m.type === 'collection_account' && m.isPaid)) &&
                                                  m.metadata?.projectName === project.name
                                              );
                                              
                                              return incomes.length > 0 ? (
                                                  incomes.map((msg, idx) => (
                                                      <div key={`income-${msg.id}-${idx}`} className="flex justify-between items-start text-sm border-b border-slate-100 pb-2">
                                                          <div className="flex flex-col">
                                                              <span className="text-slate-700 font-medium">
                                                                  {msg.type === 'invoice' ? `Factura ${msg.metadata?.number}` : `Cta. Cobro ${msg.metadata?.number}`}
                                                              </span>
                                                              <span className="text-[10px] text-slate-400">{new Date(msg.paidDate || msg.timestamp).toLocaleDateString()}</span>
                                                          </div>
                                                          <span className="text-emerald-500 font-bold whitespace-nowrap">+{formatCurrency(msg.metadata?.total || msg.metadata?.amount || 0)}</span>
                                                      </div>
                                                  ))
                                              ) : (
                                                  <div className="text-center py-2 text-slate-400 text-xs italic">Sin ingresos registrados</div>
                                              );
                                          })()}
                                          
                                          <h5 className="text-rose-600 text-xs font-bold uppercase mt-4 mb-2">Gastos</h5>
                                          {project.expenses.length > 0 ? (
                                              project.expenses.map((exp, idx) => (
                                                  <div key={`${exp.id}-${idx}`} className="flex justify-between items-start text-sm border-b border-slate-100 pb-2">
                                                      <div className="flex flex-col">
                                                          <span className="text-slate-700 font-medium">{exp.description}</span>
                                                          <span className="text-[10px] text-slate-400">{new Date(exp.date).toLocaleDateString()}</span>
                                                      </div>
                                                      <span className="text-rose-500 font-bold whitespace-nowrap">-{formatCurrency(exp.amount)}</span>
                                                  </div>
                                              ))
                                          ) : (
                                              <div className="text-center py-2 text-slate-400 text-xs italic">Sin gastos registrados</div>
                                          )}
                                      </div>
                                  </>
                              );
                          })()}
                      </div>
                  ) : (
                      // Si hay múltiples proyectos, mostrar selector
                      <div>
                          <select 
                              value={selectedProjectForCosts || uniqueApprovedProjects[0]?.id || ''} 
                              onChange={(e) => setSelectedProjectForCosts(e.target.value)}
                              className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-4 border border-slate-200 outline-none focus:border-indigo-500"
                          >
                              {uniqueApprovedProjects.map(p => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                          </select>
                          
                          {(() => {
                              const selectedProject = uniqueApprovedProjects.find(p => p.id === (selectedProjectForCosts || uniqueApprovedProjects[0]?.id));
                              if (!selectedProject) return null;
                              
                              const projectIncome = messages.filter(m => 
                                  ((m.type === 'invoice' && m.isPaid) || (m.type === 'collection_account' && m.isPaid)) &&
                                  m.metadata?.projectName === selectedProject.name
                              ).reduce((sum, m) => sum + (m.metadata?.total || m.metadata?.amount || 0), 0);
                              const projectExpenses = selectedProject.expenses.reduce((s, e) => s + e.amount, 0);
                              const balance = projectIncome - projectExpenses;
                              
                              return (
                                  <div>
                                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                              <div>
                                                  <span className="text-slate-500">Ingresos: </span>
                                                  <span className="font-bold text-emerald-500">{formatCurrency(projectIncome)}</span>
                                              </div>
                                              <div>
                                                  <span className="text-slate-500">Gastos: </span>
                                                  <span className="font-bold text-rose-500">{formatCurrency(projectExpenses)}</span>
                                              </div>
                                          </div>
                                          <div className="mt-2 pt-2 border-t border-indigo-300">
                                              <span className="text-slate-500 text-xs">Balance: </span>
                                              <span className={`font-bold text-sm ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                  {formatCurrency(balance)}
                                              </span>
                                          </div>
                                      </div>
                                      
                                      <div className="space-y-3">
                                          <h5 className="text-emerald-600 text-xs font-bold uppercase mt-4 mb-2">Ingresos</h5>
                                          {(() => {
                                              const incomes = messages.filter(m => 
                                                  ((m.type === 'invoice' && m.isPaid) || (m.type === 'collection_account' && m.isPaid)) &&
                                                  m.metadata?.projectName === selectedProject.name
                                              );
                                              
                                              return incomes.length > 0 ? (
                                                  incomes.map((msg, idx) => (
                                                      <div key={`income-${msg.id}-${idx}`} className="flex justify-between items-start text-sm border-b border-slate-100 pb-2">
                                                          <div className="flex flex-col">
                                                              <span className="text-slate-700 font-medium">
                                                                  {msg.type === 'invoice' ? `Factura ${msg.metadata?.number}` : `Cta. Cobro ${msg.metadata?.number}`}
                                                              </span>
                                                              <span className="text-[10px] text-slate-400">{new Date(msg.paidDate || msg.timestamp).toLocaleDateString()}</span>
                                                          </div>
                                                          <span className="text-emerald-500 font-bold whitespace-nowrap">+{formatCurrency(msg.metadata?.total || msg.metadata?.amount || 0)}</span>
                                                      </div>
                                                  ))
                                              ) : (
                                                  <div className="text-center py-2 text-slate-400 text-xs italic">Sin ingresos registrados</div>
                                              );
                                          })()}
                                          
                                          <h5 className="text-rose-600 text-xs font-bold uppercase mt-4 mb-2">Gastos</h5>
                                          {selectedProject.expenses.length > 0 ? (
                                              selectedProject.expenses.map((exp, idx) => (
                                                  <div key={`${exp.id}-${idx}`} className="flex justify-between items-start text-sm border-b border-slate-100 pb-2">
                                                      <div className="flex flex-col">
                                                          <span className="text-slate-700 font-medium">{exp.description}</span>
                                                          <span className="text-[10px] text-slate-400">{new Date(exp.date).toLocaleDateString()}</span>
                                                      </div>
                                                      <span className="text-rose-500 font-bold whitespace-nowrap">-{formatCurrency(exp.amount)}</span>
                                                  </div>
                                              ))
                                          ) : (
                                              <div className="text-center py-2 text-slate-400 text-xs italic">Sin gastos registrados</div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })()}
                      </div>
                  )}
               </div>
           )}

           {infoTab === 'documents' && (
               <div>
                  <h4 className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4">Documentos Enviados</h4>
                  
                  {contact.projects.length > 0 && (
                      <select 
                          value={selectedProjectForDocuments} 
                          onChange={(e) => setSelectedProjectForDocuments(e.target.value)}
                          className="w-full bg-slate-50 text-slate-700 rounded-lg p-3 mb-4 border border-slate-200 outline-none focus:border-indigo-500 text-sm"
                      >
                          <option value="all">Todos los proyectos</option>
                          {contact.projects.map(p => (
                              <option key={p.id} value={p.name}>{p.name}</option>
                          ))}
                      </select>
                  )}
                  
                  <div className="space-y-3">
                      {(() => {
                          const filteredMessages = messages.filter(m => {
                              if (m.type === 'text' || m.type === 'product') return false;
                              // Los expense (viejos) solo se muestran con toggle activado, pero expense_receipt siempre se muestra
                              if (m.type === 'expense' && !showSystemMessages) return false;
                              if (selectedProjectForDocuments === 'all') return true;
                              return m.metadata?.projectName === selectedProjectForDocuments;
                          });
                          
                          return filteredMessages.length > 0 ? (
                              filteredMessages.map((msg, idx) => {
                              let icon = 'fa-file';
                              let color = 'text-slate-500';
                              let label = 'Documento';
                              
                              if (msg.type === 'invoice') { icon = 'fa-file-invoice-dollar'; color = 'text-indigo-600'; label = 'Factura'; }
                              else if (msg.type === 'quote') { icon = 'fa-file-contract'; color = 'text-teal-600'; label = 'Cotización'; }
                              else if (msg.type === 'collection_account') { icon = 'fa-file-invoice'; color = 'text-orange-600'; label = 'Cuenta de Cobro'; }
                              else if (msg.type === 'receipt') { icon = 'fa-money-bills'; color = 'text-emerald-600'; label = 'Recibo'; }
                              else if (msg.type === 'expense') { icon = 'fa-circle-minus'; color = 'text-rose-600'; label = 'Gasto'; }
                              else if (msg.type === 'expense_receipt') { icon = 'fa-receipt'; color = 'text-rose-600'; label = 'Recibo de Gasto'; }
                              
                              return (
                                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:shadow-md transition cursor-pointer"
                                       onClick={() => {
                                           if (!msg.metadata) return;
                                           if (msg.type === 'expense') return; // Los expense no tienen documento
                                           if (msg.type === 'expense_receipt') {
                                               setViewingDocument({ type: 'expense_receipt', data: msg.metadata });
                                           } else {
                                               setViewingDocument({ type: msg.type as any, data: msg.metadata });
                                           }
                                       }}>
                                      <div className={`w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center ${color}`}>
                                          <i className={`fa-solid ${icon}`}></i>
                                      </div>
                                      <div className="flex-1">
                                          <div className="text-sm font-bold text-slate-800">{label}</div>
                                          <div className="text-xs text-slate-400">{new Date(msg.timestamp).toLocaleDateString()}</div>
                                          {(msg.type === 'expense' || msg.type === 'expense_receipt') && msg.metadata && (
                                              <div className="text-xs text-slate-600 mt-1">{msg.metadata.concept || msg.metadata.description}</div>
                                          )}
                                      </div>
                                      {(msg.type === 'expense' || msg.type === 'expense_receipt') && msg.metadata ? (
                                          <div className="text-rose-600 font-bold text-sm">-{formatCurrency(msg.metadata.amount)}</div>
                                      ) : (
                                          <i className="fa-solid fa-chevron-right text-slate-300"></i>
                                      )}
                                  </div>
                              );
                          })
                          ) : (
                              <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded border border-dashed border-slate-200">
                                  {selectedProjectForDocuments === 'all' ? 'No hay documentos enviados' : 'No hay documentos para este proyecto'}
                              </div>
                          );
                      })()}
                  </div>
               </div>
           )}

           </div>
        </div>
      )}
      
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*"
        onChange={handleDocumentUpload}
        className="hidden"
      />
      
      {/* Upload Progress Indicator */}
      {isUploadingFile && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Subiendo archivo... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
        </div>
      )}
    </div>
  );
};
