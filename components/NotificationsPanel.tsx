import React, { useState } from 'react';
import { Contact, Message, UserProfileData } from '../types';
import { DocumentViewer } from './QuoteDocument';

interface NotificationsPanelProps {
  contacts: Contact[];
  messages: Record<string, Message[]>;
  onClose: () => void;
  onSelectContact: (contactId: string) => void;
  businessLogo?: string;
  digitalSignature?: string;
  userProfile?: UserProfileData | null;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ contacts, messages, onClose, onSelectContact, businessLogo, digitalSignature, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'payments'>('quotes');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');
  const [selectedDetail, setSelectedDetail] = useState<{ message: Message; contact: Contact } | null>(null);

  // Collect all quotes and payments from messages
  const allQuotes: Array<{ message: Message, contact: Contact }> = [];
  const allPayments: Array<{ message: Message, contact: Contact }> = [];

  contacts.forEach(contact => {
    const contactMessages = messages[contact.id] || [];
    contactMessages.forEach(msg => {
      if (msg.type === 'quote') {
        allQuotes.push({ message: msg, contact });
      }
      if (msg.type === 'invoice' || msg.type === 'collection_account') {
        allPayments.push({ message: msg, contact });
      }
    });
  });

  // Filter quotes
  const filteredQuotes = allQuotes.filter(item => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return !item.message.metadata?.approved;
    if (filterStatus === 'approved') return item.message.metadata?.approved;
    return false;
  });

  // Filter payments
  const filteredPayments = allPayments.filter(item => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return !item.message.isPaid;
    if (filterStatus === 'paid') return item.message.isPaid;
    return false;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex justify-center items-start pt-10 px-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden relative">
        
        {/* Modal de Detalle de Documento (Cotización / Pago) */}
        {selectedDetail && (
          <DocumentViewer
            type={selectedDetail.message.type as any}
            data={{
              quoteNumber: selectedDetail.message.metadata?.number || selectedDetail.message.metadata?.quoteNumber || 'N/A',
              number: selectedDetail.message.metadata?.number || 'N/A',
              clientName: selectedDetail.contact.clientName,
              clientPhone: selectedDetail.contact.phone,
              contact_id: selectedDetail.contact.id,
              quote_id: selectedDetail.message.id,
              payment_id: selectedDetail.message.id,
              total: selectedDetail.message.metadata?.total || (selectedDetail.message as any).amount || 0,
              items: selectedDetail.message.metadata?.items || [{ description: selectedDetail.message.text || 'Documento', quantity: 1, price: selectedDetail.message.metadata?.total || (selectedDetail.message as any).amount || 0 }],
              date: selectedDetail.message.timestamp ? new Date(selectedDetail.message.timestamp).toISOString() : new Date().toISOString(),
              ...selectedDetail.message.metadata
            }}
            contactPhone={selectedDetail.contact.phone}
            onClose={() => setSelectedDetail(null)}
            businessLogo={businessLogo}
            digitalSignature={digitalSignature}
            userProfile={userProfile}
          />
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/30 flex-shrink-0">
              <i className="fa-solid fa-bell"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Alertas</h2>
              <p className="text-slate-500 text-[13px]">Cotizaciones y pagos pendientes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition bg-slate-100 hover:bg-slate-200 w-9 h-9 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 p-1 mx-6 mt-4 rounded-xl">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex-1 py-2.5 text-sm font-bold transition rounded-lg ${
              activeTab === 'quotes' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className="fa-solid fa-file-invoice mr-2"></i>
            Cotizaciones ({allQuotes.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-2.5 text-sm font-bold transition rounded-lg ${
              activeTab === 'payments' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <i className="fa-solid fa-money-bill-wave mr-2"></i>
            Pagos ({allPayments.length})
          </button>
        </div>

        {/* Filter Status */}
        <div className="px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                filterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                filterStatus === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Pendientes
            </button>
            {activeTab === 'quotes' ? (
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  filterStatus === 'approved' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Aprobadas
              </button>
            ) : (
              <button
                onClick={() => setFilterStatus('paid')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  filterStatus === 'paid' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Pagadas
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
          {activeTab === 'quotes' && (
            <div className="space-y-3">
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map(({ message, contact }) => (
                  <div 
                    key={message.id}
                    onClick={() => { setSelectedDetail({ message, contact }); }}
                    className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer group flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <img
                        src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.clientName)}&background=6366f1&color=fff`}
                        alt={contact.clientName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition truncate">
                            {contact.clientName}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            message.metadata?.approved 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {message.metadata?.approved ? 'Aprobada' : 'Pendiente'}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-600 truncate">
                          Cotización #{message.metadata?.number || message.metadata?.quoteNumber || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(message.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-lg text-indigo-600">
                          {formatCurrency(message.metadata?.total || (message as any).amount || 0)}
                        </p>
                        <span className="text-[10px] text-indigo-500 font-semibold opacity-0 group-hover:opacity-100 transition block">
                          Ver Detalle 📄
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectContact(contact.id);
                          onClose();
                        }}
                        title="Ir al chat con este contacto"
                        className="w-10 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white transition flex items-center justify-center shadow-sm hover:scale-105 cursor-pointer border border-indigo-100"
                      >
                        <i className="fa-solid fa-chevron-right text-sm"></i>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-file-invoice text-slate-400 text-2xl"></i>
                  </div>
                  <p className="text-slate-400 italic">No hay cotizaciones {filterStatus !== 'all' ? filterStatus === 'pending' ? 'pendientes' : 'aprobadas' : ''}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-3">
              {filteredPayments.length > 0 ? (
                filteredPayments.map(({ message, contact }) => (
                  <div 
                    key={message.id}
                    onClick={() => { setSelectedDetail({ message, contact }); }}
                    className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer group flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <img
                        src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.clientName)}&background=10b981&color=fff`}
                        alt={contact.clientName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition truncate">
                            {contact.clientName}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            message.isPaid 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {message.isPaid ? 'Pagada' : 'Pendiente'}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-600 truncate">
                          {message.type === 'invoice' ? 'Factura' : 'Cuenta de Cobro'} #{message.metadata?.number || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatDate(message.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-lg text-emerald-600">
                          {formatCurrency(message.metadata?.total || (message as any).amount || 0)}
                        </p>
                        <span className="text-[10px] text-emerald-500 font-semibold opacity-0 group-hover:opacity-100 transition block">
                          Ver Detalle 📄
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectContact(contact.id);
                          onClose();
                        }}
                        title="Ir al chat con este contacto"
                        className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white transition flex items-center justify-center shadow-sm hover:scale-105 cursor-pointer border border-emerald-100"
                      >
                        <i className="fa-solid fa-chevron-right text-sm"></i>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-money-bill-wave text-slate-400 text-2xl"></i>
                  </div>
                  <p className="text-slate-400 italic">No hay pagos {filterStatus !== 'all' ? filterStatus === 'pending' ? 'pendientes' : 'pagados' : ''}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
