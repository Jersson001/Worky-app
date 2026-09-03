import React, { useState } from 'react';
import { FAMILIAS, tiposDe } from '../utils/tiposDeNegocio';
import { UserProfileData } from '../types';

interface WelcomeOnboardingProps {
  onComplete: (userData: UserProfileData) => Promise<void>;
  onBack?: () => void;
  initialEmail?: string;
  initialPhone?: string;
  initialName?: string;
}

export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({ onComplete, onBack, initialEmail = '', initialPhone = '', initialName = '' }) => {
  // Cargar credenciales temporales si existen
  const tempCreds = localStorage.getItem('tempCredentials');
  const savedCreds = tempCreds ? JSON.parse(tempCreds) : null;

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [businessType, setBusinessType] = useState('');
  const [businessLogo, setBusinessLogo] = useState('');
  const [username, setUsername] = useState(savedCreds?.username || '');
  const [password, setPassword] = useState(savedCreds?.password || '');
  const [email, setEmail] = useState(savedCreds?.email || initialEmail);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nit, setNit] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Colombia');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    const userData: UserProfileData = {
      businessName,
      ownerName,
      phone,
      businessType,
      businessLogo,
      username: '',
      password: '',
      email: email || initialEmail,
      nit,
      address,
      city,
      country,
    };

    try {
      // Guardar perfil en Supabase. Esperar a que termine.
      await onComplete(userData);
      // Si llegamos aquí, guardó exitosamente.
      localStorage.removeItem('tempCredentials');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setSubmitError(errorMsg);
      setIsSubmitting(false);
      // No continuar hasta que se arregle
    }
  };

  const canComplete = businessName.trim() && ownerName.trim() && city.trim() && country.trim() && phone.trim() && businessType.trim();

  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 font-sans overflow-hidden">
      {/* Fondo animado */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Contenido */}
      <div className="relative z-10 w-full flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <img src="/worky-logo-2.png" alt="Worky" className="w-64 mx-auto mb-8" />
            <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
              ¡Bienvenido a Worky! 🎉
            </h1>
            <p className="text-purple-200 text-xl">
              Configura tu perfil de negocio
            </p>
          </div>



          {/* Card del formulario */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 animate-scale-in max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Botón atrás y título */}
              <div className="flex items-center gap-4">
                {onBack && (
                  <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                )}
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-briefcase text-indigo-600"></i>
                  Información de tu negocio
                </h2>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nombre del Negocio *
                </label>
                <input 
                  type="text" 
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-medium text-slate-800"
                  placeholder="Ej: Carpintería El Roble"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Tu Nombre Completo *
                </label>
                <input 
                  type="text" 
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-medium text-slate-800"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Tipo de Negocio *
                </label>
                <select 
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-medium text-slate-800"
                >
                  <option value="">Selecciona una opción</option>
                  {FAMILIAS.map(f => {
                    const tipos = tiposDe(f.key);
                    if (!tipos.length) return null;
                    const opciones = tipos.map(t => (
                      <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                    ));
                    // «Otro» no necesita encabezado: va suelto al final.
                    return f.label
                      ? <optgroup key={f.key} label={f.label}>{opciones}</optgroup>
                      : <React.Fragment key={f.key}>{opciones}</React.Fragment>;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Teléfono de Contacto *
                </label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-medium text-slate-800"
                  placeholder="+57 300 123 4567"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Ciudad *
                  </label>
                  <input 
                    type="text" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-medium text-slate-800"
                    placeholder="Ej: Bogotá"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    País *
                  </label>
                  <input 
                    type="text" 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-medium text-slate-800"
                    placeholder="Colombia"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  NIT / RUT / Cédula (opcional)
                </label>
                <input 
                  type="text" 
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-medium text-slate-800"
                  placeholder="Ej: 900.123.456-7 o 12.345.678-9"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Dirección (opcional)
                </label>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-medium text-slate-800"
                  placeholder="Ej: Calle 123 # 45-67, Of. 301"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Logo del Negocio (opcional)
                </label>
                <div className="flex items-center gap-4">
                  {businessLogo ? (
                    <div className="w-24 h-24 rounded-xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                      <img src={businessLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                      <i className="fa-solid fa-image text-3xl"></i>
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer inline-block px-6 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-200 transition">
                      <i className="fa-solid fa-upload mr-2"></i>
                      {businessLogo ? 'Cambiar Logo' : 'Subir Logo'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    {businessLogo && (
                      <button
                        onClick={() => setBusinessLogo('')}
                        className="ml-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-semibold transition"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {submitError}
                </div>
              )}

              <button
                onClick={handleComplete}
                disabled={!canComplete || isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    Completar Registro
                    <i className="fa-solid fa-check"></i>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-purple-200 text-sm">
            Podrás modificar esta información más tarde en Configuración
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};
