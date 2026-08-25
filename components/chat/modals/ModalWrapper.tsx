/**
 * Shared modal wrapper — DRY frame for all 8 modals.
 * Provides backdrop, close button, icon + title header.
 */
import React from 'react';

interface ModalWrapperProps {
  show: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  iconColor: string;
  children: React.ReactNode;
  /**
   * Panel flotante que cubre el modal mientras se edita algo que no cabe
   * cómodamente en el formulario. Al cerrarlo se vuelve a ver `children`.
   */
  overlay?: React.ReactNode;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = React.memo(({
  show,
  onClose,
  title,
  icon,
  iconColor,
  children,
  overlay,
}) => {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 sm:p-6 relative border border-slate-100 max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>
        <h3 className="text-slate-900 font-bold text-lg mb-4 flex items-center gap-2.5 pr-8">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <i className={`fa-solid ${icon} ${iconColor} text-sm`}></i>
          </div>
          <span className="truncate">{title}</span>
        </h3>
        <div className="overflow-y-auto custom-scrollbar flex-1 -mr-1 pr-1">
          {children}
        </div>
        {overlay}
      </div>
    </div>
  );
});

ModalWrapper.displayName = 'ModalWrapper';
