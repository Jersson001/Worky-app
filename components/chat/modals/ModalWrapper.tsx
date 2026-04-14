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
}

export const ModalWrapper: React.FC<ModalWrapperProps> = React.memo(({
  show,
  onClose,
  title,
  icon,
  iconColor,
  children,
}) => {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <h3 className="text-slate-800 font-bold text-lg mb-6 flex items-center gap-2">
          <i className={`fa-solid ${icon} ${iconColor}`}></i> {title}
        </h3>
        {children}
      </div>
    </div>
  );
});

ModalWrapper.displayName = 'ModalWrapper';
