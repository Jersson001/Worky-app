import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, database } from '../services/firebaseConfig';
import { setCurrentUserId } from '../services/messagingService';

interface LoginScreenProps {
  onLogin: () => void;
  onRegister: (email: string, phone: string, fullName: string) => void;
}

type AuthMode = 'login' | 'register';

// Map Firebase error codes to friendly Spanish messages
const getAuthErrorMessage = (code: string): string => {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/user-not-found':
      return 'No existe una cuenta con este correo. ¿Quieres registrarte?';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Contraseña incorrecta. Inténtalo de nuevo.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.';
    case 'auth/network-request-failed':
      return 'Error de conexión. Revisa tu internet e intenta de nuevo.';
    default:
      return 'Error de autenticación. Inténtalo de nuevo.';
  }
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+57');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'register') {
        // ── Validation ──
        if (!firstName || !lastName || !email || !phone || !password) {
          setError('Completa todos los campos requeridos.');
          setLoading(false);
          return;
        }

        // ── Firebase Auth: Create user ──
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const fullName = `${firstName} ${lastName}`;
        const fullPhone = `${countryCode} ${phone}`;

        // ── Create user profile doc in RTDB ──
        const profileRef = ref(database, `users/${user.uid}/profile`);
        await set(profileRef, {
          businessName: fullName,
          ownerName: fullName,
          email: email,
          phone: fullPhone,
          createdAt: Date.now(),
        });

        // ── Register in user index for search ──
        const normalizedEmail = email.replace(/\s+/g, '').toLowerCase();
        const safeEmail = normalizedEmail.replace(/\./g, ',').replace(/[#$\[\]]/g, '_');
        const indexRefEmail = ref(database, `userIndex/${safeEmail}`);
        await set(indexRefEmail, user.uid);

        const normalizedPhone = fullPhone.replace(/\s+/g, '').toLowerCase();
        const indexRefPhone = ref(database, `userIndex/${normalizedPhone}`);
        await set(indexRefPhone, user.uid);

        // ── Register public info ──
        const publicInfoRef = ref(database, `users/${user.uid}/publicInfo`);
        await set(publicInfoRef, {
          phoneOrEmail: normalizedEmail,
          phone: normalizedPhone,
          registeredAt: Date.now(),
        });

        // ── Set current user ID ──
        setCurrentUserId(user.uid, email);

        // ── Notify App.tsx ──
        onRegister(email, fullPhone, fullName);

      } else {
        // ── Login Flow ──
        if (!email || !password) {
          setError('Ingresa tu correo y contraseña.');
          setLoading(false);
          return;
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Set current user ID
        setCurrentUserId(user.uid, user.email || email);

        // Notify App.tsx
        onLogin();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const errorCode = err?.code || '';
      setError(getAuthErrorMessage(errorCode));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-screen min-h-screen font-sans" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)' }}>
      {/* Panel izquierdo - Hero */}
      <div className="hidden md:flex w-1/2 flex-col justify-center items-center relative overflow-hidden">
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
                onClick={() => { setAuthMode('login'); setError(''); }}
                disabled={authMode === 'login'}
              >
                Iniciar sesión
              </button>
              <button
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${authMode === 'register'
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}
                onClick={() => { setAuthMode('register'); setError(''); }}
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
                      placeholder="Tu contraseña (mín. 6 caracteres)"
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
                    <label className="block text-sm font-medium text-slate-300 mb-2">Correo electrónico</label>
                    <input
                      type="email"
                      className="w-full p-4 bg-slate-700/50 border border-slate-600 text-white rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition placeholder-slate-500"
                      placeholder="tu@email.com"
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
                    {authMode === 'register' ? 'Creando cuenta...' : 'Iniciando sesión...'}
                  </span>
                ) : authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-slate-500 text-sm">
                {authMode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button
                  onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}
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
