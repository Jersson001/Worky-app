import React, { useState } from 'react';
import { PaymentAccount, ThirdPartyAccount } from '../types';

interface WalletModalProps {
  accounts: PaymentAccount[];
  savedAccounts: ThirdPartyAccount[];
  onClose: () => void;
  onSendDetails?: (account: PaymentAccount) => void;
  onSavePaymentAccount: (account: PaymentAccount) => Promise<void>;
  onDeletePaymentAccount: (accountId: string) => Promise<void>;
  onSaveThirdPartyAccount: (account: ThirdPartyAccount) => void;
  onDeleteThirdPartyAccount: (accountId: string) => void;
}

type FormMode = 'list' | 'add_receive' | 'edit_receive' | 'add_pay' | 'edit_pay';

export const WalletModal: React.FC<WalletModalProps> = ({
  accounts,
  savedAccounts,
  onClose,
  onSendDetails,
  onSavePaymentAccount,
  onDeletePaymentAccount,
  onSaveThirdPartyAccount,
  onDeleteThirdPartyAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'receive' | 'pay'>('receive');
  const [formMode, setFormMode] = useState<FormMode>('list');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Receive Form Fields
  const [receiveBankName, setReceiveBankName] = useState<'Bancolombia' | 'Nequi' | 'Daviplata' | 'Efectivo'>('Bancolombia');
  const [receiveAccountType, setReceiveAccountType] = useState<'Ahorros' | 'Corriente' | 'Celular'>('Ahorros');
  const [receiveAccountNumber, setReceiveAccountNumber] = useState('');
  const [receiveHolderName, setReceiveHolderName] = useState('');
  const [editingReceiveId, setEditingReceiveId] = useState<string | null>(null);

  // Pay Form Fields
  const [payAlias, setPayAlias] = useState('');
  const [payBankName, setPayBankName] = useState('');
  const [payAccountType, setPayAccountType] = useState('');
  const [payAccountNumber, setPayAccountNumber] = useState('');
  const [payHolderName, setPayHolderName] = useState('');
  const [payDocumentId, setPayDocumentId] = useState('');
  const [editingPayId, setEditingPayId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getBankStyles = (bank: string) => {
    switch (bank) {
      case 'Bancolombia':
        return { color: '#fdd835', iconClass: 'fa-solid fa-building-columns' };
      case 'Nequi':
        return { color: '#6f00ef', iconClass: 'fa-solid fa-mobile-screen' };
      case 'Daviplata':
        return { color: '#ef4444', iconClass: 'fa-solid fa-mobile-screen-button' };
      default:
        return { color: '#10b981', iconClass: 'fa-solid fa-money-bill-wave' };
    }
  };

  const handleSaveReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveAccountNumber.trim() || !receiveHolderName.trim()) return;

    const styles = getBankStyles(receiveBankName);
    const accountId = editingReceiveId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));

    const newAccount: PaymentAccount = {
      id: accountId,
      bankName: receiveBankName,
      accountType: receiveAccountType,
      accountNumber: receiveAccountNumber.trim(),
      holderName: receiveHolderName.trim(),
      color: styles.color,
      iconClass: styles.iconClass,
    };

    await onSavePaymentAccount(newAccount);
    setFormMode('list');
  };

  const handleDeleteReceive = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta?')) {
      await onDeletePaymentAccount(id);
      setFormMode('list');
    }
  };

  const handleSavePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAlias.trim() || !payBankName.trim() || !payAccountNumber.trim() || !payHolderName.trim()) return;

    const accountId = editingPayId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));

    const newAccount: ThirdPartyAccount = {
      id: accountId,
      alias: payAlias.trim(),
      bankName: payBankName.trim(),
      accountType: payAccountType.trim() || 'Ahorros',
      accountNumber: payAccountNumber.trim(),
      holderName: payHolderName.trim(),
      documentId: payDocumentId.trim() || undefined,
    };

    onSaveThirdPartyAccount(newAccount);
    setFormMode('list');
  };

  const handleDeletePay = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta cuenta de terceros?')) {
      onDeleteThirdPartyAccount(id);
      setFormMode('list');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/80 animate-fade-in backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-700/50" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
               <i className="fa-solid fa-wallet text-lg"></i>
            </div>
            <h3 className="text-white font-bold text-lg">
              {formMode === 'list' ? 'Billetera' : 
               formMode.startsWith('add') ? 'Agregar Cuenta' : 'Editar Cuenta'}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition">
             <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Form Mode Content */}
        {formMode === 'list' ? (
          <>
            {/* Tabs */}
            <div className="flex p-2 gap-2 bg-slate-900/50">
              <button 
                 onClick={() => setActiveTab('receive')}
                 className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'receive' ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/30' : 'bg-transparent text-slate-400 hover:text-white'}`}
              >
                 <i className="fa-solid fa-arrow-down-long"></i> Recibir
              </button>
              <button 
                 onClick={() => setActiveTab('pay')}
                 className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'pay' ? 'bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/30' : 'bg-transparent text-slate-400 hover:text-white'}`}
              >
                 <i className="fa-solid fa-arrow-up-long"></i> Pagar
              </button>
            </div>

            {/* List Content */}
            <div className="p-5 bg-slate-900/30 min-h-[350px] max-h-[500px] overflow-y-auto custom-scrollbar">
               
               {activeTab === 'receive' && (
                 <div className="space-y-4 animate-scale-in">
                    <button 
                      onClick={() => {
                        setEditingReceiveId(null);
                        setReceiveBankName('Bancolombia');
                        setReceiveAccountType('Ahorros');
                        setReceiveAccountNumber('');
                        setReceiveHolderName('');
                        setFormMode('add_receive');
                      }}
                      className="w-full bg-slate-700/30 hover:bg-slate-700/60 text-slate-300 font-semibold py-2.5 px-4 rounded-xl border border-dashed border-slate-600 hover:border-blue-500/50 flex items-center justify-center gap-2 transition"
                    >
                      <i className="fa-solid fa-plus text-xs"></i> Agregar Cuenta de Cobro
                    </button>

                    <div className="space-y-3">
                      {accounts.map(acc => (
                        <div key={acc.id} className="bg-slate-700/50 p-4 rounded-xl border border-slate-600/50 hover:border-blue-500/50 transition group relative backdrop-blur-sm">
                          <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg border-2 border-slate-600"
                                  style={{ backgroundColor: acc.color }}
                                >
                                    {acc.bankName === 'Bancolombia' ? 'B' : acc.bankName === 'Nequi' ? 'N' : <i className={acc.iconClass}></i>}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold leading-tight">{acc.bankName}</h4>
                                    <p className="text-slate-400 text-xs font-medium">{acc.accountType} • {acc.holderName}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                  {onSendDetails && (
                                      <button 
                                          onClick={() => { onSendDetails(acc); onClose(); }}
                                          className="text-white bg-gradient-to-r from-blue-600 to-violet-600 w-8 h-8 rounded-full flex items-center justify-center hover:from-blue-500 hover:to-violet-500 transition shadow-lg shadow-blue-500/30"
                                          title="Enviar al chat"
                                      >
                                          <i className="fa-solid fa-paper-plane text-xs"></i>
                                      </button>
                                  )}
                                  <button 
                                      onClick={() => {
                                        setEditingReceiveId(acc.id);
                                        setReceiveBankName(acc.bankName);
                                        setReceiveAccountType(acc.accountType);
                                        setReceiveAccountNumber(acc.accountNumber);
                                        setReceiveHolderName(acc.holderName);
                                        setFormMode('edit_receive');
                                      }}
                                      className="text-slate-400 bg-slate-600/50 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-600 hover:text-white transition"
                                      title="Editar"
                                  >
                                      <i className="fa-solid fa-pencil text-xs"></i>
                                  </button>
                                  <button 
                                      onClick={() => handleCopy(acc.accountNumber, acc.id)}
                                      className="text-slate-400 bg-slate-600/50 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-600 hover:text-white transition"
                                      title="Copiar número"
                                  >
                                      <i className={`fa-regular ${copiedId === acc.id ? 'fa-circle-check text-emerald-400' : 'fa-copy'}`}></i>
                                  </button>
                              </div>
                          </div>
                          <div className="bg-slate-800/50 py-2 px-3 rounded-lg border border-slate-600/50 text-center font-mono text-lg text-white tracking-widest select-all font-bold">
                              {acc.accountNumber}
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
               )}

               {activeTab === 'pay' && (
                 <div className="flex flex-col gap-5 animate-scale-in">
                    <button 
                      onClick={() => {
                        setEditingPayId(null);
                        setPayAlias('');
                        setPayBankName('');
                        setPayAccountType('');
                        setPayAccountNumber('');
                        setPayHolderName('');
                        setPayDocumentId('');
                        setFormMode('add_pay');
                      }}
                      className="w-full bg-slate-700/30 hover:bg-slate-700/60 text-slate-300 font-semibold py-2.5 px-4 rounded-xl border border-dashed border-slate-600 hover:border-rose-500/50 flex items-center justify-center gap-2 transition"
                    >
                      <i className="fa-solid fa-plus text-xs"></i> Agregar Cuenta de Tercero
                    </button>

                    <div>
                      <h4 className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-3">Apps Bancarias</h4>
                      <div className="grid grid-cols-3 gap-3">
                          {[{n:'Nequi', c:'#6f00ef', l:'N'}, {n:'Bancolombia', c:'#fdd835', l:'B'}, {n:'Daviplata', c:'#ef4444', l:'D'}].map(bank => (
                            <button key={bank.n} className="bg-slate-700/50 hover:bg-slate-600/50 p-3 rounded-xl border border-slate-600/50 flex flex-col items-center gap-2 transition group backdrop-blur-sm hover:border-slate-500">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition" style={{ backgroundColor: bank.c }}>{bank.l}</div>
                                <span className="text-slate-300 font-bold text-xs">{bank.n}</span>
                            </button>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                        Cuentas Guardadas <span className="bg-blue-500/20 text-blue-400 px-1.5 rounded-full text-[10px]">{savedAccounts.length}</span>
                      </h4>
                      <div className="flex flex-col gap-3">
                          {savedAccounts.length > 0 ? (
                            savedAccounts.map(acc => (
                                <div key={acc.id} className="bg-slate-700/50 p-3 rounded-xl border border-slate-600/50 flex justify-between items-center hover:border-slate-500 transition backdrop-blur-sm group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-600/50 flex items-center justify-center text-slate-300 font-bold text-xs uppercase border border-slate-500">
                                            {acc.alias.substring(0,2)}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-xs">{acc.alias}</div>
                                            <div className="text-slate-400 text-[10px] font-medium">{acc.bankName} • {acc.accountNumber}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => {
                                              setEditingPayId(acc.id);
                                              setPayAlias(acc.alias);
                                              setPayBankName(acc.bankName);
                                              setPayAccountType(acc.accountType);
                                              setPayAccountNumber(acc.accountNumber);
                                              setPayHolderName(acc.holderName);
                                              setPayDocumentId(acc.documentId || '');
                                              setFormMode('edit_pay');
                                            }}
                                            className="text-slate-400 hover:text-white bg-slate-600/50 w-7 h-7 rounded-full flex items-center justify-center transition border border-slate-500/50"
                                            title="Editar"
                                        >
                                            <i className="fa-solid fa-pencil text-[10px]"></i>
                                        </button>
                                        <button 
                                            onClick={() => handleCopy(acc.accountNumber, acc.id)}
                                            className="text-slate-400 hover:text-white bg-slate-600/50 w-7 h-7 rounded-full flex items-center justify-center transition border border-slate-500/50"
                                            title="Copiar"
                                        >
                                            <i className={`fa-regular ${copiedId === acc.id ? 'fa-circle-check text-emerald-400' : 'fa-copy'} text-[10px]`}></i>
                                        </button>
                                    </div>
                                </div>
                            ))
                          ) : (
                            <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-800/50 rounded-xl border border-dashed border-slate-600/50">
                              No tienes cuentas de terceros guardadas.
                            </div>
                          )}
                      </div>
                    </div>
                 </div>
               )}

            </div>
          </>
        ) : (
          /* Form rendering */
          <div className="p-5 bg-slate-900/30">
            {formMode.endsWith('receive') ? (
              <form onSubmit={handleSaveReceive} className="space-y-4 animate-scale-in">
                <div>
                  <label className="text-slate-400 text-xs font-semibold mb-1 block">Banco / Plataforma</label>
                  <select 
                    value={receiveBankName} 
                    onChange={e => setReceiveBankName(e.target.value as any)}
                    className="w-full bg-slate-700/50 text-white p-2.5 rounded-xl border border-slate-600 outline-none focus:border-blue-500"
                  >
                    <option value="Bancolombia">Bancolombia</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Efectivo">Efectivo / Caja</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-xs font-semibold mb-1 block">Tipo de Cuenta</label>
                  <select 
                    value={receiveAccountType} 
                    onChange={e => setReceiveAccountType(e.target.value as any)}
                    className="w-full bg-slate-700/50 text-white p-2.5 rounded-xl border border-slate-600 outline-none focus:border-blue-500"
                  >
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                    <option value="Celular">Número de Celular</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-xs font-semibold mb-1 block">Número de Cuenta</label>
                  <input 
                    type="text" 
                    value={receiveAccountNumber} 
                    onChange={e => setReceiveAccountNumber(e.target.value)}
                    placeholder="Ej: 234-567890-12"
                    className="w-full bg-slate-700/50 text-white p-2.5 rounded-xl border border-slate-600 outline-none focus:border-blue-500 placeholder-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs font-semibold mb-1 block">Nombre del Titular</label>
                  <input 
                    type="text" 
                    value={receiveHolderName} 
                    onChange={e => setReceiveHolderName(e.target.value)}
                    placeholder="Ej: Juan Pérez o Carpintería SAS"
                    className="w-full bg-slate-700/50 text-white p-2.5 rounded-xl border border-slate-600 outline-none focus:border-blue-500 placeholder-slate-500"
                    required
                  />
                </div>

                <div className="flex gap-2.5 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setFormMode('list')}
                    className="flex-1 bg-slate-700 text-slate-200 py-2.5 rounded-xl font-bold hover:bg-slate-600 transition"
                  >
                    Cancelar
                  </button>
                  {formMode === 'edit_receive' && editingReceiveId && (
                    <button 
                      type="button" 
                      onClick={() => handleDeleteReceive(editingReceiveId)}
                      className="bg-red-500/20 hover:bg-red-500/40 text-red-400 w-11 rounded-xl flex items-center justify-center transition border border-red-500/30"
                      title="Eliminar"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 text-white py-2.5 rounded-xl font-bold hover:from-blue-500 hover:to-violet-500 transition shadow-lg shadow-blue-500/30"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSavePay} className="space-y-3 animate-scale-in">
                <div>
                  <label className="text-slate-400 text-[10px] font-semibold mb-1 block">Alias / Nombre identificador</label>
                  <input 
                    type="text" 
                    value={payAlias} 
                    onChange={e => setPayAlias(e.target.value)}
                    placeholder="Ej: Proveedor Maderas El Roble"
                    className="w-full bg-slate-700/50 text-white p-2.5 rounded-xl border border-slate-600 outline-none focus:border-rose-500 placeholder-slate-500 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] font-semibold mb-1 block">Banco</label>
                  <input 
                    type="text" 
                    value={payBankName} 
                    onChange={e => setPayBankName(e.target.value)}
                    placeholder="Ej: Bancolombia, Nequi, etc."
                    className="w-full bg-slate-700/50 text-white p-2.5 rounded-xl border border-slate-600 outline-none focus:border-rose-500 placeholder-slate-500 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-[10px] font-semibold mb-1 block">Tipo de Cuenta</label>
                    <input 
                      type="text" 
                      value={payAccountType} 
                      onChange={e => setPayAccountType(e.target.value)}
                      placeholder="Ahorros, Corriente..."
                      className="w-full bg-slate-700/50 text-white p-2.5 rounded-xl border border-slate-600 outline-none focus:border-rose-500 placeholder-slate-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-[10px] font-semibold mb-1 block">Documento/NIT (Opcional)</label>
                    <input 
                      type="text" 
                      value={payDocumentId} 
                      onChange={e => setPayDocumentId(e.target.value)}
                      placeholder="Ej: NIT 900.123..."
                      className="w-full bg-slate-700/50 text-white p-2.5 rounded-xl border border-slate-600 outline-none focus:border-rose-500 placeholder-slate-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] font-semibold mb-1 block">Número de Cuenta</label>
                  <input 
                    type="text" 
                    value={payAccountNumber} 
                    onChange={e => setPayAccountNumber(e.target.value)}
                    placeholder="Ej: 987-654321-00"
                    className="w-full bg-slate-700/50 text-white p-2.5 rounded-xl border border-slate-600 outline-none focus:border-rose-500 placeholder-slate-500 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] font-semibold mb-1 block">Nombre del Titular</label>
                  <input 
                    type="text" 
                    value={payHolderName} 
                    onChange={e => setPayHolderName(e.target.value)}
                    placeholder="Ej: Maderas El Roble SAS"
                    className="w-full bg-slate-700/50 text-white p-2.5 rounded-xl border border-slate-600 outline-none focus:border-rose-500 placeholder-slate-500 text-xs"
                    required
                  />
                </div>

                <div className="flex gap-2.5 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setFormMode('list')}
                    className="flex-1 bg-slate-700 text-slate-200 py-2.5 rounded-xl font-bold hover:bg-slate-600 transition"
                  >
                    Cancelar
                  </button>
                  {formMode === 'edit_pay' && editingPayId && (
                    <button 
                      type="button" 
                      onClick={() => handleDeletePay(editingPayId)}
                      className="bg-red-500/20 hover:bg-red-500/40 text-red-400 w-11 rounded-xl flex items-center justify-center transition border border-red-500/30"
                      title="Eliminar"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-rose-500 to-red-500 text-white py-2.5 rounded-xl font-bold hover:from-rose-400 hover:to-red-400 transition shadow-lg shadow-rose-500/30"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
