import React, { useState } from 'react';

interface UserSearchResult {
  userId: string;
  name?: string;
  avatar?: string;
  phone?: string;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (phoneOrEmail: string) => Promise<UserSearchResult | null>;
  onAddContact: (user: UserSearchResult) => Promise<void>;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  onAddContact
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Por favor ingresa un teléfono o email');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResult(null);

    try {
      const result = await onSearch(searchQuery.trim());
      if (result) {
        setSearchResult(result);
      } else {
        setError('Usuario no encontrado. Asegúrate de que el teléfono o email sea correcto y que el usuario esté registrado en Worky.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al buscar usuario');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContact = async () => {
    if (!searchResult) return;

    setIsAdding(true);
    setError(null);

    try {
      await onAddContact(searchResult);
      // Cerrar modal y limpiar estado
      handleClose();
      alert('✅ Contacto agregado exitosamente');
    } catch (err: any) {
      setError(err.message || 'Error al agregar contacto');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResult(null);
    setError(null);
    setIsSearching(false);
    setIsAdding(false);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">Buscar Usuarios</h3>
            <p className="text-indigo-100 text-sm mt-1">Encuentra usuarios por teléfono o email</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center transition"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Search Input */}
          <div className="mb-4">
            <label className="block text-slate-700 text-sm font-medium mb-2">
              Teléfono o Email
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="+57 300 123 4567 o usuario@email.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  disabled={isSearching || isAdding}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <i className="fa-solid fa-xmark text-sm"></i>
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span className="hidden sm:inline">Buscando...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-search"></i>
                    <span className="hidden sm:inline">Buscar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-500 mt-0.5"></i>
              <p className="text-red-700 text-sm flex-1">{error}</p>
            </div>
          )}

          {/* Search Result */}
          {searchResult && !error && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={searchResult.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(searchResult.name || 'Usuario')}&background=6366f1&color=fff`}
                  alt={searchResult.name}
                  className="w-16 h-16 rounded-full border-2 border-indigo-200"
                />
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-lg">{searchResult.name || 'Usuario'}</h4>
                  {searchResult.phone && (
                    <p className="text-slate-600 text-sm mt-1">
                      <i className="fa-solid fa-phone mr-2"></i>
                      {searchResult.phone}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleAddContact}
                disabled={isAdding}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {isAdding ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Agregando...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-user-plus"></i>
                    <span>Agregar Contacto</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 text-xs flex items-start gap-2">
              <i className="fa-solid fa-info-circle mt-0.5"></i>
              <span>
                <strong>Tip:</strong> El usuario debe estar registrado en Worky con el mismo teléfono o email que ingreses.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};








