import React, { useState } from 'react';
import { Contact, Message } from '../types';

interface NotificationsPanelProps {
  contacts: Contact[];
  messages: Record<string, Message[]>;
  onClose: () => void;
  onSelectContact: (contactId: string) => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ contacts, messages, onClose, onSelectContact }) => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'payments'>('quotes');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'paid'>('all');

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
    <div className="fixed inset-0 bg-slate-950/80 z-[100] flex justify-center items-start pt-10 px-4 animate-fade-in backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-700/50">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700/50" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                <i className="fa-solid fa-bell"></i>
              </div>
              Notificaciones
            </h2>
            <p className="text-slate-400 text-sm mt-1 ml-14">Cotizaciones y pagos pendientes</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition bg-slate-700/50 w-10 h-10 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-900/50 p-1 border-b border-slate-700/50">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex-1 py-3 text-sm font-bold transition rounded-xl ${
              activeTab === 'quotes' ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-file-invoice mr-2"></i>
            Cotizaciones ({allQuotes.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-3 text-sm font-bold transition rounded-xl ${
              activeTab === 'payments' ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-money-bill-wave mr-2"></i>
            Pagos ({allPayments.length})
          </button>
        </div>

        {/* Filter Status */}
        <div className="p-4 bg-slate-900/30 border-b border-slate-700/50">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                filterStatus === 'all' ? 'bg-slate-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                filterStatus === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Pendientes
            </button>
            {activeTab === 'quotes' ? (
              <button
                onClick={() => setFilterStatus('approved')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  filterStatus === 'approved' ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                Aprobadas
              </button>
            ) : (
              <button
                onClick={() => setFilterStatus('paid')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  filterStatus === 'paid' ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
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
                    onClick={() => { onSelectContact(contact.id); onClose(); }}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <img 
                          src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.clientName)}&background=6366f1&color=fff`} 
                          alt={contact.clientName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition">
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
                          <p className="text-sm text-slate-600">
                            Cotización #{message.metadata?.number || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDate(message.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-indigo-600">
                          {formatCurrency(message.metadata?.total || 0)}
                        </p>
                        <i className="fa-solid fa-chevron-right text-slate-300 text-sm mt-2"></i>
                      </div>
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
                    onClick={() => { onSelectContact(contact.id); onClose(); }}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <img 
                          src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.clientName)}&background=6366f1&color=fff`} 
                          alt={contact.clientName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition">
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
                          <p className="text-sm text-slate-600">
                            {message.type === 'invoice' ? 'Factura' : 'Cuenta de Cobro'} #{message.metadata?.number || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {formatDate(message.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-emerald-600">
                          {formatCurrency(message.metadata?.total || 0)}
                        </p>
                        <i className="fa-solid fa-chevron-right text-slate-300 text-sm mt-2"></i>
                      </div>
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
