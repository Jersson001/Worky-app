import React, { useState } from 'react';
import { authService } from '../services/authService';

interface LoginScreenProps {
  onLogin: () => void;
  onRegister: (email: string, phone: string, fullName: string) => void;
}

type AuthMethod = 'email' | 'phone' | 'credentials';
type AuthStep = 'mode_selection' | 'input' | 'verify';
type AuthMode = 'login' | 'register';
type LoginType = 'email' | 'phone' | 'username';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister }) => {
  const [authStep, setAuthStep] = useState<AuthStep>('mode_selection');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+57');
  const [phone, setPhone] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginCountryCode, setLoginCountryCode] = useState('+57');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationId, setVerificationId] = useState('');
  // Lógica de cambio de modo
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loginType, setLoginType] = useState<LoginType>('email');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (authMode === 'login') {
      // Simulación de login
      setTimeout(() => {
        setLoading(false);
        onLogin();
      }, 1000);
    } else {
      // Simulación de registro
      if (!firstName || !lastName || !email || !phone || !password) {
        setError('Completa todos los campos requeridos.');
        setLoading(false);
        return;
      }
      setTimeout(() => {
        setLoading(false);
        onRegister(email, countryCode + ' ' + phone, firstName + ' ' + lastName);
      }, 1000);
    }
  };

  return (
    <div className="flex w-screen min-h-screen font-sans" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)' }}>
      {/* Panel izquierdo - Hero */}
      <div className="hidden md:flex w-1/2 flex-col justify-center items-center relative overflow-hidden">
        {/* Efectos de fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-violet-600/10 to-transparent z-0"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl"></div>
        
        <div className="z-10 flex flex-col items-center">
          <img src="/worky-logo.png" alt="Worky" className="w-72 mb-4 drop-shadow-2xl" />
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400 text-3xl font-bold uppercase tracking-wide">Gestiona tus proyectos</p>
          <p className="text-slate-500 mt-4 text-center max-w-sm">La plataforma inteligente para emprendedores que quieren crecer</p>
        </div>
      </div>
      
      {/* Panel derecho - Formulario */}
      <div className="w-full md:w-1/2 flex items-center justify-center min-h-screen overflow-y-auto p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="w-full max-w-md">
          {/* Logo visible en móvil */}
          <div className="md:hidden flex flex-col items-center mb-8">
            <img src="/worky-logo.png" alt="Worky" className="w-48 mb-2" />
            <p className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400 text-xl font-bold uppercase">Gestiona tus proyectos</p>
          </div>
          
          {/* Card de formulario */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
            <div className="mb-6 flex justify-center gap-2">
              <button
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${authMode === 'login' 
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}
                onClick={() => setAuthMode('login')}
                disabled={authMode === 'login'}
              >
                Iniciar sesión
              </button>
              <button
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${authMode === 'register' 
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}
                onClick={() => setAuthMode('register')}
                disabled={authMode === 'register'}
              >
                Registrarse
              </button>
            </div>
            
            <form className="space-y-5" onSubmit={handleSubmit}>
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nombre *</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-slate-700/50 border border-slate-600 text-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder-slate-500"
                      placeholder="Jersson"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Apellidos *</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-slate-700/50 border border-slate-600 text-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder-slate-500"
                    placeholder="Escobar"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Correo electrónico *</label>
                  <input
                    type="email"
                    className="w-full p-4 bg-slate-700/50 border border-slate-600 text-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder-slate-500"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <div className="w-1/3">
                    <label className="block text-sm font-medium text-slate-300 mb-2">País</label>
                    <select
                      className="w-full p-4 bg-slate-700/50 border border-slate-600 text-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      value={countryCode}
                      onChange={e => setCountryCode(e.target.value)}
                      required
                    >
                      <option value="+57">🇨🇴 +57</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+55">🇧🇷 +55</option>
                      <option value="+1">🇺🇸 +1</option>
                    </select>
                  </div>
                  <div className="w-2/3">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Celular *</label>
                    <input
                      type="tel"
                      className="w-full p-4 bg-slate-700/50 border border-slate-600 text-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder-slate-500"
                      placeholder="3142036659"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña *</label>
                  <input
                    type="password"
                    className="w-full p-4 bg-slate-700/50 border border-slate-600 text-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder-slate-500"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </>
            )}
            {authMode === 'login' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email, celular o usuario</label>
                  <input
                    type="text"
                    className="w-full p-4 bg-slate-700/50 border border-slate-600 text-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder-slate-500"
                    placeholder="tu@email.com, 3142036659 o @usuario"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
                  <input
                    type="password"
                    className="w-full p-4 bg-slate-700/50 border border-slate-600 text-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder-slate-500"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            {error && <p className="text-red-400 text-sm font-medium bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-violet-500 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Cargando...
                </span>
              ) : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
          
          {/* Footer del card */}
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              {authMode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-blue-400 hover:text-blue-300 font-medium transition"
              >
                {authMode === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
