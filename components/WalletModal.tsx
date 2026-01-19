
import React, { useState } from 'react';
import { PaymentAccount, ThirdPartyAccount } from '../types';

interface WalletModalProps {
  accounts: PaymentAccount[];
  savedAccounts: ThirdPartyAccount[];
  onClose: () => void;
  onSendDetails?: (account: PaymentAccount) => void;
  onAddThirdParty: (account: ThirdPartyAccount) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ accounts, savedAccounts, onClose, onSendDetails, onAddThirdParty }) => {
  const [activeTab, setActiveTab] = useState<'receive' | 'pay'>('receive');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
            <h3 className="text-white font-bold text-lg">Billetera</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-700/50 text-slate-400 hover:text-white flex items-center justify-center transition">
             <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

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

        {/* Content */}
        <div className="p-5 bg-slate-900/30 min-h-[350px]">
           
           {activeTab === 'receive' && (
             <div className="space-y-4 animate-scale-in">
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
                  <div className="flex flex-col gap-3 max-h-[180px] overflow-y-auto custom-scrollbar">
                      {savedAccounts.length > 0 ? (
                        savedAccounts.map(acc => (
                            <div key={acc.id} className="bg-slate-700/50 p-3 rounded-xl border border-slate-600/50 flex justify-between items-center hover:border-slate-500 transition backdrop-blur-sm group">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-slate-600/50 flex items-center justify-center text-slate-300 font-bold text-xs uppercase border border-slate-500">
                                        {acc.alias.substring(0,2)}
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-xs">{acc.alias}</div>
                                        <div className="text-slate-500 text-[10px] font-medium">{acc.bankName} • {acc.accountNumber}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleCopy(acc.accountNumber, acc.id)}
                                    className="text-slate-400 hover:text-white bg-slate-600/50 w-8 h-8 rounded-full flex items-center justify-center transition border border-slate-500/50"
                                >
                                    <i className={`fa-regular ${copiedId === acc.id ? 'fa-circle-check text-emerald-400' : 'fa-copy'}`}></i>
                                </button>
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
      </div>
    </div>
  );
};
