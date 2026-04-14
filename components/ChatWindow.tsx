/**
 * ChatWindow — thin orchestrator.
 * Composes hooks and sub-components. All business logic lives in the modules.
 *
 * Original: 2393 lines → Now: ~250 lines.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Contact, Message, ProjectStage, Product, PaymentAccount, UserProfileData, Project } from '../types';
import { DocumentViewer } from './QuoteDocument';
import { formatCurrency } from '../utils/currency';
import { calculateTax } from '../utils/taxCalculations';
import { useChatFormState } from '../hooks/useChatFormState';
import { useFileUpload } from '../hooks/useFileUpload';

// Sub-components
import { ChatHeader } from './chat/ChatHeader';
import { ChatFooter } from './chat/ChatFooter';
import { MessageList } from './chat/MessageList';
import { InfoPanel } from './chat/InfoPanel';

// Modals
import { ExpenseModal } from './chat/modals/ExpenseModal';
import { InvoiceModal } from './chat/modals/InvoiceModal';
import { QuoteModal } from './chat/modals/QuoteModal';
import { CollectionModal } from './chat/modals/CollectionModal';
import { ReceiptModal } from './chat/modals/ReceiptModal';
import { ProductPickerModal } from './chat/modals/ProductPickerModal';
import { PaymentConfirmModal } from './chat/modals/PaymentConfirmModal';
import { QRPreviewModal } from './chat/modals/QRPreviewModal';

// ─── Props (unchanged contract) ─────────────────────────────────────────────

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

// ─── Component ───────────────────────────────────────────────────────────────

export const ChatWindow: React.FC<ChatWindowProps> = ({
  contact, allContacts, messages, onSendMessage, onUpdateStage, onAddExpense,
  onUpdateProjectInfo, products, paymentAccounts, onBack, activeAction, onClearAction,
  onUpdateMessage, businessLogo, digitalSignature, userProfile, onOpenGantt,
}) => {
  // ── UI Toggles ──
  const [showInfo, setShowInfo] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  const [showSystemMessages, setShowSystemMessages] = useState(false);

  // ── Document viewer ──
  const [viewingDocument, setViewingDocument] = useState<{ type: 'quote' | 'invoice' | 'receipt' | 'collection_account', data: any } | null>(null);

  // ── Hooks ──
  const forms = useChatFormState(
    contact.clientName,
    contact.phone || '',
    contact.projects[0]?.id || ''
  );

  const fileUpload = useFileUpload({
    contactId: contact.id,
    onSendMessage,
  });

  // ── Derived data ──
  const approvedProjects = useMemo(() => {
    const approved = contact.projects.filter(p => (p as any).metadata?.quoteCode);
    return approved.filter((project, index, self) =>
      index === self.findIndex(pp => pp.name === project.name)
    );
  }, [contact.projects]);

  const approvedProjectsCount = approvedProjects.length;
  const displayProjectName = approvedProjects.length > 0 ? approvedProjects[0].name : 'Sin proyectos';
  const hasMultipleProjects = approvedProjectsCount > 1;

  const totalGlobalValue = contact.projects.reduce((sum, p) => sum + p.value, 0);
  const totalGlobalExpenses = contact.projects.reduce((sum, p) => sum + p.expenses.reduce((s, e) => s + e.amount, 0), 0);
  const globalProfit = totalGlobalValue - totalGlobalExpenses;

  // ── Sync contact changes ──
  useEffect(() => {
    forms.setCollectionField('directedTo', contact.clientName);
    if (contact.projects.length > 0) {
      forms.setExpenseField('targetProjectId', contact.projects[0].id);
    }
    if (contact.phone) {
      forms.setQuoteField('clientPhone', contact.phone);
    }
  }, [contact]);

  // ── Handle active action from parent ──
  useEffect(() => {
    if (activeAction) {
      const actionMap: Record<string, keyof typeof forms.modals> = {
        invoice: 'invoice',
        quote: 'quote',
        collection_account: 'collection',
        expense: 'expense',
      };
      const modal = actionMap[activeAction];
      if (modal) {
        if (activeAction === 'quote') forms.setQuoteField('clientPhone', contact.phone || '');
        forms.openModal(modal);
      }
      onClearAction?.();
    }
  }, [activeAction, onClearAction, contact.phone]);

  // ── Handlers ──
  const handleSaveExpense = useCallback(() => {
    const { amount, description, targetProjectId } = forms.expense;
    if (!amount || !description) return;

    if ((contact.role === 'supplier' || contact.projects.length > 1) && !targetProjectId) {
      alert('Por favor selecciona a qué proyecto pertenece este gasto.');
      return;
    }

    onAddExpense(Number(amount), description, targetProjectId || undefined);

    const selectedProject = contact.projects.find(p => p.id === targetProjectId) || contact.projects[0];
    onSendMessage('', 'expense_receipt', {
      id: Date.now().toString(),
      number: `RG-${Math.floor(Math.random() * 10000)}`,
      amount: Number(amount),
      concept: description,
      projectId: targetProjectId || contact.projects[0]?.id,
      projectName: selectedProject?.name || '',
      date: new Date(),
      paymentMethod: 'Gasto Registrado',
    });

    forms.resetExpense();
    forms.closeModal('expense');
  }, [forms.expense, contact, onAddExpense, onSendMessage]);

  const handleSendInvoice = useCallback(() => {
    const validItems = forms.invoice.items.filter(i => i.description && i.price > 0);
    if (validItems.length === 0) return;

    const subtotal = validItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const result = calculateTax(subtotal, forms.invoice.taxType);
    const selectedProject = contact.projects.find(p => p.id === forms.invoice.selectedProject);

    const taxDetails: any = { type: forms.invoice.taxType };
    if (forms.invoice.taxType === 'iva') {
      taxDetails.iva = result.taxAmount;
      taxDetails.ivaPercentage = 19;
    } else if (forms.invoice.taxType === 'aiu' && result.breakdown) {
      taxDetails.administracion = result.breakdown.administracion;
      taxDetails.imprevistos = result.breakdown.imprevistos;
      taxDetails.utilidad = result.breakdown.utilidad;
      taxDetails.ivaUtilidad = result.breakdown.ivaUtilidad;
    }

    onSendMessage('📄 Factura generada', 'invoice', {
      id: Date.now().toString(),
      number: `FAC-${Math.floor(Math.random() * 10000)}`,
      clientName: contact.clientName,
      items: validItems, subtotal, taxDetails,
      total: result.total,
      projectName: selectedProject?.name || '',
      date: new Date(), status: 'Pending',
    });

    forms.resetInvoice();
    forms.closeModal('invoice');
  }, [forms.invoice, contact, onSendMessage]);

  const handleSendQuote = useCallback(() => {
    const { items, taxType, taxPercentage, aiuAdmin, aiuImprevistos, aiuUtilidad, aiuIva, clientAddress, clientPhone, validDays } = forms.quote;
    const validItems = items.filter(i => i.description && i.price > 0);
    if (validItems.length === 0) return;

    const subtotal = validItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const result = calculateTax(subtotal, taxType, {
      percentage: parseFloat(taxPercentage) || 19,
      aiu: { adminPercent: parseFloat(aiuAdmin) || 5, imprevistosPercent: parseFloat(aiuImprevistos) || 5, utilidadPercent: parseFloat(aiuUtilidad) || 5, ivaPercent: parseFloat(aiuIva) || 19 },
    });

    const validDate = new Date();
    validDate.setDate(validDate.getDate() + parseInt(validDays || '15'));

    onSendMessage('📋 Cotización enviada', 'quote', {
      id: Date.now().toString(),
      number: `COT-${Math.floor(Math.random() * 10000)}`,
      clientName: contact.clientName,
      clientAddress: clientAddress.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      items: validItems, subtotal, total: result.total,
      taxType, taxPercentage: taxType === 'percentage' ? parseFloat(taxPercentage) : undefined,
      taxAmount: (taxType !== 'none') ? result.taxAmount : undefined,
      aiuAdmin: taxType === 'aiu' ? parseFloat(aiuAdmin) : undefined,
      aiuImprevistos: taxType === 'aiu' ? parseFloat(aiuImprevistos) : undefined,
      aiuUtilidad: taxType === 'aiu' ? parseFloat(aiuUtilidad) : undefined,
      aiuIva: taxType === 'aiu' ? parseFloat(aiuIva) : undefined,
      date: new Date(), validUntil: validDate, status: 'pending',
    });

    forms.resetQuote(contact.phone || '');
    forms.closeModal('quote');
  }, [forms.quote, contact, onSendMessage]);

  const handleSendCollection = useCallback(() => {
    const { amount, concept, directedTo, nit, selectedAccount, selectedProject } = forms.collection;
    if (!amount || !concept) return;

    const selectedAcc = selectedAccount === 'efectivo' ? null : paymentAccounts.find(acc => acc.id === selectedAccount);
    const project = contact.projects.find(p => p.id === selectedProject);

    onSendMessage('📨 Cuenta de Cobro enviada', 'collection_account', {
      id: Date.now().toString(),
      number: `CC-${Math.floor(Math.random() * 10000)}`,
      amount: Number(amount), concept, directedTo, nit,
      bankName: selectedAccount === 'efectivo' ? 'Pago en Efectivo' : (selectedAcc?.bankName || ''),
      accountType: selectedAccount === 'efectivo' ? '' : (selectedAcc?.accountType || ''),
      accountNumber: selectedAccount === 'efectivo' ? '' : (selectedAcc?.accountNumber || ''),
      holderName: selectedAccount === 'efectivo' ? '' : (selectedAcc?.holderName || ''),
      projectName: project?.name || '', date: new Date(),
    });

    forms.resetCollection(contact.clientName);
    forms.closeModal('collection');
  }, [forms.collection, contact, paymentAccounts, onSendMessage]);

  const handleSendReceipt = useCallback(() => {
    const { amount, concept, selectedAccount } = forms.receipt;
    if (!amount || !concept) return;

    const selectedAcc = selectedAccount === 'efectivo' ? null : paymentAccounts.find(acc => acc.id === selectedAccount);

    const receiptMetadata: any = {
      id: Date.now().toString(),
      number: `RC-${Math.floor(Math.random() * 10000)}`,
      amount: Number(amount), concept, date: new Date(),
      paymentMethod: selectedAccount === 'efectivo' ? 'Efectivo' : 'Transferencia',
      bankName: selectedAccount === 'efectivo' ? 'Pago en Efectivo' : (selectedAcc?.bankName || ''),
      accountType: selectedAccount === 'efectivo' ? '' : (selectedAcc?.accountType || ''),
      accountNumber: selectedAccount === 'efectivo' ? '' : (selectedAcc?.accountNumber || ''),
      holderName: selectedAccount === 'efectivo' ? '' : (selectedAcc?.holderName || ''),
      selectedAccountId: selectedAccount,
    };

    if (contact.role === 'supplier') {
      receiptMetadata.clientName = contact.clientName;
      receiptMetadata.fromSupplier = true;
    }

    onSendMessage(
      contact.role === 'supplier' ? '💰 Recibo de pago recibido' : '💰 Recibo de pago generado',
      'receipt', receiptMetadata
    );

    forms.resetReceipt();
    forms.closeModal('receipt');
  }, [forms.receipt, contact, paymentAccounts, onSendMessage]);

  const handleConfirmPayment = useCallback(() => {
    if (!forms.pendingPayment) return;
    const message = messages.find(m => m.id === forms.pendingPayment!.id);
    if (message) {
      onUpdateMessage(forms.pendingPayment.id, { ...message, isPaid: true, paidDate: new Date() });
    }
    forms.setPendingPayment(null);
    forms.closeModal('paymentConfirm');
  }, [forms.pendingPayment, messages, onUpdateMessage]);

  const handleCopyPaymentInfo = useCallback((metadata: any) => {
    let textToCopy = '';
    if (metadata.accountNumber) {
      textToCopy = `Banco: ${metadata.bankName || ''}\nTipo: ${metadata.accountType || ''}\nNúmero de cuenta: ${metadata.accountNumber}\nTitular: ${metadata.holderName || ''}\nMonto: ${formatCurrency(metadata.amount || metadata.total || 0)}`;
    } else {
      textToCopy = `Monto: ${formatCurrency(metadata.amount || metadata.total || 0)}`;
    }
    navigator.clipboard.writeText(textToCopy).then(() => {
      forms.setCopiedText(metadata.number || 'info');
      setTimeout(() => forms.setCopiedText(null), 2000);
    }).catch(err => console.error('Error al copiar:', err));
  }, []);

  const handleMarkPayment = useCallback((msg: Message) => {
    forms.setPendingPayment({ id: msg.id, type: msg.type, metadata: msg.metadata });
    forms.openModal('paymentConfirm');
  }, []);

  const handleShowQR = useCallback((qrUrl: string, metadata: any) => {
    forms.setQrPreviewData({ qrUrl, metadata });
    forms.openModal('qrPreview');
  }, []);

  const handleCameraCapture = useCallback(() => {
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
  }, [onSendMessage]);

  const handleSendTextMessage = useCallback((text: string) => {
    onSendMessage(text);
  }, [onSendMessage]);

  const handleSelectProduct = useCallback((product: Product) => {
    onSendMessage('', 'product', product);
    forms.closeModal('productPicker');
  }, [onSendMessage]);

  // ── Render ──
  return (
    <div className="flex-1 flex h-full relative">
      {/* Document Viewer */}
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
        <ChatHeader
          contact={contact}
          approvedProjectsCount={approvedProjectsCount}
          displayProjectName={displayProjectName}
          hasMultipleProjects={hasMultipleProjects}
          onBack={onBack}
          onToggleInfo={() => setShowInfo(!showInfo)}
          showInfo={showInfo}
          onOpenGantt={onOpenGantt}
          onOpenProductPicker={() => forms.openModal('productPicker')}
        />

        {/* Financial Bar */}
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
                <span className={`font-black text-sm ${globalProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(globalProfit)}</span>
              </div>
            </div>
            <button onClick={() => forms.openModal('expense')} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-2 rounded-lg text-xs flex items-center gap-2 border border-rose-500/30 transition font-bold">
              <i className="fa-solid fa-circle-minus"></i> Registrar Gasto
            </button>
          </div>
        )}

        <MessageList
          messages={messages}
          showSystemMessages={showSystemMessages}
          contactRole={contact.role}
          contactName={contact.clientName}
          copiedText={forms.copiedText}
          onViewDocument={(type, data) => setViewingDocument({ type, data })}
          onMarkPayment={handleMarkPayment}
          onUpdateMessage={onUpdateMessage}
          onCopyPaymentInfo={handleCopyPaymentInfo}
          onShowQR={handleShowQR}
        />

        <ChatFooter
          contactRole={contact.role}
          contactPhone={contact.phone}
          onSendMessage={handleSendTextMessage}
          onOpenQuote={() => { forms.setQuoteField('clientPhone', contact.phone || ''); forms.openModal('quote'); }}
          onOpenCollection={() => forms.openModal('collection')}
          onOpenInvoice={() => forms.openModal('invoice')}
          onOpenReceipt={() => forms.openModal('receipt')}
          onOpenExpense={() => forms.openModal('expense')}
          onOpenProductPicker={() => forms.openModal('productPicker')}
          onTriggerDocumentInput={fileUpload.triggerDocumentInput}
          onCameraCapture={handleCameraCapture}
        />

        {/* ── Modals ── */}
        <ExpenseModal
          show={forms.modals.expense} onClose={() => forms.closeModal('expense')}
          contact={contact} allContacts={allContacts}
          amount={forms.expense.amount} description={forms.expense.description} targetProjectId={forms.expense.targetProjectId}
          onAmountChange={(v) => forms.setExpenseField('amount', v)} onDescriptionChange={(v) => forms.setExpenseField('description', v)} onTargetProjectChange={(v) => forms.setExpenseField('targetProjectId', v)}
          onSave={handleSaveExpense}
        />
        <InvoiceModal
          show={forms.modals.invoice} onClose={() => forms.closeModal('invoice')}
          items={forms.invoice.items} selectedProject={forms.invoice.selectedProject} taxType={forms.invoice.taxType}
          uniqueApprovedProjects={approvedProjects}
          onAddItem={forms.addInvoiceItem} onUpdateItem={forms.updateInvoiceItem} onDeleteItem={forms.deleteInvoiceItem}
          onSelectProject={(v) => forms.setInvoiceField('selectedProject', v)} onChangeTaxType={(v) => forms.setInvoiceField('taxType', v as any)}
          onSend={handleSendInvoice}
        />
        <QuoteModal
          show={forms.modals.quote} onClose={() => { forms.resetQuote(contact.phone || ''); forms.closeModal('quote'); }}
          contactRole={contact.role} items={forms.quote.items}
          validDays={forms.quote.validDays} taxType={forms.quote.taxType} taxPercentage={forms.quote.taxPercentage}
          aiuAdmin={forms.quote.aiuAdmin} aiuImprevistos={forms.quote.aiuImprevistos} aiuUtilidad={forms.quote.aiuUtilidad} aiuIva={forms.quote.aiuIva}
          clientAddress={forms.quote.clientAddress} clientPhone={forms.quote.clientPhone}
          showProductPicker={forms.quote.showProductPicker} products={products}
          onAddItem={forms.addQuoteItem} onDeleteItem={forms.deleteQuoteItem} onUpdateItem={forms.updateQuoteItem} onUpdateItemPrice={forms.updateQuoteItemPrice}
          onAddProductToQuote={forms.addProductToQuote} onShowProductPicker={(v) => forms.setQuoteField('showProductPicker', v)}
          onImageUpload={(e, idx) => fileUpload.handleQuoteImageUpload(e, idx, forms.addQuoteItemImages)} onRemoveImage={forms.removeQuoteItemImage} onUpdateItemImage={forms.updateQuoteItemImage}
          onSetValidDays={(v) => forms.setQuoteField('validDays', v)} onSetTaxType={(v) => forms.setQuoteField('taxType', v as any)} onSetTaxPercentage={(v) => forms.setQuoteField('taxPercentage', v)}
          onSetAIUAdmin={(v) => forms.setQuoteField('aiuAdmin', v)} onSetAIUImprevistos={(v) => forms.setQuoteField('aiuImprevistos', v)} onSetAIUUtilidad={(v) => forms.setQuoteField('aiuUtilidad', v)} onSetAIUIva={(v) => forms.setQuoteField('aiuIva', v)}
          onSetClientAddress={(v) => forms.setQuoteField('clientAddress', v)} onSetClientPhone={(v) => forms.setQuoteField('clientPhone', v)}
          onSend={handleSendQuote}
        />
        <CollectionModal
          show={forms.modals.collection} onClose={() => forms.closeModal('collection')}
          uniqueApprovedProjects={approvedProjects} paymentAccounts={paymentAccounts}
          amount={forms.collection.amount} concept={forms.collection.concept} directedTo={forms.collection.directedTo} nit={forms.collection.nit} selectedAccount={forms.collection.selectedAccount} selectedProject={forms.collection.selectedProject}
          onAmountChange={(v) => forms.setCollectionField('amount', v)} onConceptChange={(v) => forms.setCollectionField('concept', v)} onDirectedToChange={(v) => forms.setCollectionField('directedTo', v)} onNitChange={(v) => forms.setCollectionField('nit', v)} onAccountChange={(v) => forms.setCollectionField('selectedAccount', v)} onProjectChange={(v) => forms.setCollectionField('selectedProject', v)}
          onSend={handleSendCollection}
        />
        <ReceiptModal
          show={forms.modals.receipt} onClose={() => forms.closeModal('receipt')}
          contactRole={contact.role} uniqueApprovedProjects={approvedProjects} paymentAccounts={paymentAccounts}
          amount={forms.receipt.amount} concept={forms.receipt.concept} selectedAccount={forms.receipt.selectedAccount}
          onAmountChange={(v) => forms.setReceiptField('amount', v)} onConceptChange={(v) => forms.setReceiptField('concept', v)} onAccountChange={(v) => forms.setReceiptField('selectedAccount', v)}
          onSend={handleSendReceipt}
        />
        <ProductPickerModal
          show={forms.modals.productPicker} onClose={() => forms.closeModal('productPicker')}
          products={products} onSelectProduct={handleSelectProduct}
        />
        <PaymentConfirmModal
          show={forms.modals.paymentConfirm} pendingPayment={forms.pendingPayment}
          onClose={() => { forms.setPendingPayment(null); forms.closeModal('paymentConfirm'); }}
          onConfirm={handleConfirmPayment}
        />
        <QRPreviewModal
          show={forms.modals.qrPreview} qrData={forms.qrPreviewData} copiedText={forms.copiedText}
          onClose={() => { forms.setQrPreviewData(null); forms.closeModal('qrPreview'); }}
          onCopyPaymentInfo={handleCopyPaymentInfo}
        />
      </div>

      {/* Info Panel */}
      <InfoPanel
        show={showInfo}
        onClose={() => setShowInfo(false)}
        contact={contact}
        messages={messages}
        showSystemMessages={showSystemMessages}
        onViewDocument={(type: any, data: any) => setViewingDocument({ type, data })}
        onUpdateProjectInfo={onUpdateProjectInfo}
      />

      {/* Hidden file inputs */}
      <input ref={fileUpload.fileInputRef} type="file" accept="image/*" onChange={fileUpload.handleImageUpload} className="hidden" />
      <input ref={fileUpload.cameraInputRef} type="file" accept="image/*" capture="environment" onChange={fileUpload.handleImageUpload} className="hidden" />
      <input ref={fileUpload.documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,image/*" onChange={fileUpload.handleDocumentUpload} className="hidden" />

      {/* Upload Progress */}
      {fileUpload.isUploading && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3">
          <i className="fa-solid fa-spinner fa-spin"></i>
          <span>Subiendo archivo... {fileUpload.uploadProgress > 0 ? `${fileUpload.uploadProgress}%` : ''}</span>
        </div>
      )}
    </div>
  );
};
