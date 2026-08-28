import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabaseConfig';
import { setCurrentUserId } from '../services/messagingService';
import { llegoInvitado, vendedorPendiente } from '../services/catalogShareService';

interface LoginScreenProps {
  onLogin: () => void;
  onRegister: (email: string, phone: string, fullName: string) => void;
  /**
   * Quién le compartió el catálogo, cuando llega escaneando un QR. Se le
   * enseña para que sepa dónde está entrando y por qué: sin esto, el salto del
   * catálogo a una pantalla de registro parece de otra app.
   */
  invitadoPor?: { name: string; avatar?: string } | null;
}

// Si el registro quedó pendiente de confirmar por correo (signUp sin sesión),
// guardamos los datos aquí para poder forzar el onboarding cuando vuelva a
// entrar ya confirmado — de lo contrario needsOnboarding nunca se activaría
// porque el trigger de Supabase ya creó una fila mínima en user_profiles.
const PENDING_REGISTRATION_KEY = 'worky_pendingRegistration';

type AuthMode = 'login' | 'register';

// Traduce el error de Supabase a un mensaje accionable.
//
// Ojo: recibe el objeto de error completo, no un string. La versión
// anterior recibía err.message y lo comparaba contra códigos, así que
// nunca coincidía y TODO caía en el default genérico, ocultando la
// causa real (proveedor apagado, rate limit, etc.).
const getAuthErrorMessage = (err: any): string => {
  const code = String(err?.code ?? err?.error_code ?? '');
  const msg = String(err?.message ?? '').toLowerCase();
  const has = (...frases: string[]) => frases.some((f) => msg.includes(f));

  if (code === 'email_provider_disabled' || has('email logins are disabled', 'email signups are disabled')) {
    return 'El proveedor de Email está desactivado en Supabase. Actívalo en Authentication → Providers → Email.';
  }
  if (code === 'over_email_send_rate_limit' || has('rate limit')) {
    return 'Límite de envío de correos alcanzado. Desactiva "Confirm email" en Supabase o espera unos minutos.';
  }
  if (code === 'signup_disabled' || has('signups not allowed')) {
    return 'El registro de nuevos usuarios está desactivado en Supabase.';
  }
  if (code === 'user_already_exists' || has('already registered', 'already been registered')) {
    return 'Este correo electrónico ya está registrado. Intenta iniciar sesión.';
  }
  if (code === 'invalid_credentials' || has('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (code === 'email_not_confirmed' || has('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión.';
  }
  if (code === 'weak_password' || has('password should be', 'password is too short')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (code === 'email_address_invalid' || has('is invalid', 'unable to validate email')) {
    return 'El correo electrónico no es válido.';
  }
  if (has('failed to fetch', 'networkerror')) {
    return 'No se pudo conectar con Supabase. Revisa tu conexión y las claves del .env.';
  }

  // Preferible un mensaje feo y cierto que uno bonito y falso.
  return err?.message ? `Error de Supabase: ${err.message}` : 'Error de autenticación. Inténtalo de nuevo.';
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister, invitadoPor }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+57');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Quien llega invitado desde un catálogo casi nunca tiene cuenta: se le abre
  // directamente en «Registrarse», que si no acaba mirando un formulario de
  // acceso que no puede rellenar.
  const [authMode, setAuthMode] = useState<AuthMode>(invitadoPor ? 'register' : 'login');

  /**
   * Quien llega escaneando un QR ve un registro corto: nombre, correo, celular
   * y contraseña. Nada más.
   *
   * Viene a escribirle a alguien, no a darse de alta en una plataforma: cada
   * campo de más es un sitio donde abandona. Apellidos y país los aporta el
   * onboarding exprés (apellidos van dentro del nombre; el país se asume +57,
   * que es de donde llega todo el mundo hoy).
   *
   * Se lee de localStorage y no de `invitadoPor` porque el nombre del vendedor
   * se consulta al servidor y tarda: sin esto el visitante ve el formulario
   * largo durante un instante y luego le cambia debajo de las manos.
   */
  const [llegaPorCatalogo] = useState(() => llegoInvitado());
  const formularioCorto = llegaPorCatalogo || !!invitadoPor;

  // El nombre del invitador se consulta al servidor, así que suele llegar
  // después del primer pintado: por eso no basta con el valor inicial de
  // arriba. Se ajusta una sola vez, para no pisar al que cambie de pestaña.
  const pestanaAjustada = useRef(false);
  useEffect(() => {
    if (!invitadoPor || pestanaAjustada.current) return;
    pestanaAjustada.current = true;
    setAuthMode('register');
  }, [invitadoPor]);
  // Se acaba de registrar pero Supabase exige confirmar el correo antes de
  // dar sesión (signUp devuelve session: null). No se puede hacer nada más
  // hasta que haga clic en el enlace del email.
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'register') {
        // ── Validation ──
        // En el formulario corto no hay apellidos: el nombre completo se
        // escribe entero en un solo campo.
        if (!firstName || (!formularioCorto && !lastName) || !email || !phone || !password) {
          setError('Completa todos los campos requeridos.');
          setLoading(false);
          return;
        }

        const fullName = formularioCorto ? firstName.trim() : `${firstName} ${lastName}`;
        // E.164 estricto (sin espacios): Supabase rechaza el envío de SMS si el
        // número no matchea ese formato exacto.
        const fullPhone = `${countryCode}${phone.replace(/\s+/g, '')}`;
        const normalizedEmail = email.trim().toLowerCase();

        // ── Supabase Auth: Create user with email/password ──
        // full_name y phone viajan como metadata: el trigger
        // on_auth_user_created los lee para espejar el usuario en
        // user_profiles y public_info sin depender del cliente.
        //
        // El vendedor va con ellos por otro motivo: hasta ahora solo vivía en
        // el localStorage de este navegador, y quien confirma el correo suele
        // abrir el enlace en el navegador de su app de correo, que es otro.
        // Allí no había ni rastro de a quién iba a escribirle y aterrizaba en
        // una app vacía. Prendido de la cuenta, el dato le sigue a donde entre.
        const vendedor = vendedorPendiente();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: fullName, phone: fullPhone, ...(vendedor ? { vendedor } : {}) },
          },
        });

        if (signUpError) throw signUpError;
        if (!data.user) throw new Error('No user returned from signup');

        const user = data.user;

        if (!data.session) {
          // "Confirm email" está activo: no hay sesión todavía, así que
          // CUALQUIER escritura aquí (user_profiles, user_index, public_info)
          // chocaría con RLS porque auth.uid() es NULL sin sesión. El trigger
          // en auth.users (SECURITY DEFINER) ya creó la fila mínima; el resto
          // se completa cuando confirme el correo y vuelva a iniciar sesión.
          localStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify({ email: normalizedEmail, phone: fullPhone, fullName }));
          setPendingEmailConfirmation(normalizedEmail);
          setLoading(false);
          return;
        }

        // El trigger ya creó la fila; esto solo la enriquece con los datos
        // que Auth no conoce. upsert, no insert: con el trigger por delante
        // un insert chocaría por clave duplicada y rompería el registro.
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert(
            {
              id: user.id,
              business_name: fullName,
              owner_name: fullName,
              email: normalizedEmail,
              phone: fullPhone,
            },
            { onConflict: 'id' }
          );

        if (profileError) console.warn('Profile upsert:', profileError.message);

        // ── Register in user index for search ──
        // upsert, no insert: reintentar el registro no debe romper por clave duplicada.
        const safeEmail = normalizedEmail.replace(/[\.\#\$\[\]]/g, '_');
        const normalizedPhone = fullPhone.replace(/\s+/g, '').toLowerCase();

        const { error: indexError } = await supabase
          .from('user_index')
          .upsert(
            [
              { safe_key: safeEmail, user_id: user.id },
              // También indexado por teléfono: así te encuentran por cualquiera de los dos.
              { safe_key: normalizedPhone.replace(/[\.\#\$\[\]]/g, '_'), user_id: user.id },
            ],
            { onConflict: 'safe_key' }
          );

        if (indexError) console.warn('Index error:', indexError);

        // ── Register public info ──
        // display_name y avatar_url son lo que ve quien te busca; sin ellos
        // el otro usuario aparece como "Usuario" sin foto.
        const { error: publicInfoError } = await supabase
          .from('public_info')
          .upsert(
            {
              user_id: user.id,
              phone_or_email: normalizedEmail,
              display_name: fullName,
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
            },
            { onConflict: 'user_id' }
          );

        if (publicInfoError) console.warn('Public info error:', publicInfoError);

        // ── Set current user ID ──
        setCurrentUserId(user.id, email);

        // ── Notify App.tsx ── (email ya confirmado al instante: sin "Confirm email" activo, signUp da sesión de una)
        onRegister(email, fullPhone, fullName);

      } else {
        // ── Login Flow ──
        if (!email || !password) {
          setError('Ingresa tu correo y contraseña.');
          setLoading(false);
          return;
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        if (!data.user) throw new Error('No user returned from signin');

        const user = data.user;

        // Set current user ID
        setCurrentUserId(user.id, user.email || email);

        // Si este login viene justo después de confirmar el correo de un
        // registro nuevo, forzamos el onboarding (si no, needsOnboarding
        // quedaría en false porque el trigger ya creó una fila mínima).
        const pendingRaw = localStorage.getItem(PENDING_REGISTRATION_KEY);
        if (pendingRaw) {
          localStorage.removeItem(PENDING_REGISTRATION_KEY);
          try {
            const pending = JSON.parse(pendingRaw);
            if (pending.email?.toLowerCase() === (user.email || email).toLowerCase()) {
              onRegister(pending.email, pending.phone, pending.fullName);
              return;
            }
          } catch (_) { /* JSON corrupto, ignorar y seguir como login normal */ }
        }

        // Notify App.tsx
        onLogin();
      }
    } catch (err: any) {
      // Se registra el objeto completo: code/status son lo que permite
      // distinguir un proveedor apagado de una contraseña mala.
      console.error('Auth error:', { code: err?.code, status: err?.status, message: err?.message, err });
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (pendingEmailConfirmation) {
    return (
      <div className="flex w-screen min-h-screen font-sans items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
        {/* Subtle geometric background */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-2xl shadow-slate-200/60 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mb-5 mx-auto shadow-lg shadow-blue-500/25">
              <i className="fa-solid fa-envelope-circle-check text-white text-2xl"></i>
            </div>
            <h2 className="text-slate-900 text-xl font-bold mb-2">Revisa tu correo</h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Te enviamos un enlace de confirmación a <span className="text-blue-600 font-bold">{pendingEmailConfirmation}</span>.
              Haz clic ahí y luego vuelve a iniciar sesión.
            </p>
            <button
              onClick={() => { setPendingEmailConfirmation(null); setAuthMode('login'); setError(''); }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold hover:shadow-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.99]"
            >
              Ya confirmé, iniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-screen min-h-screen font-sans bg-slate-50 relative overflow-hidden">
      {/* Elementos geométricos decorativos de fondo */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:28px_28px] opacity-50 pointer-events-none"></div>
      
      {/* Formas geométricas sutiles flotantes */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      
      {/* Acentos geométricos vectoriales sutiles */}
      <div className="absolute top-12 left-12 w-24 h-24 border border-blue-200/50 rounded-3xl rotate-12 pointer-events-none hidden lg:block"></div>
      <div className="absolute bottom-16 left-1/3 w-16 h-16 border border-indigo-200/40 rounded-2xl -rotate-6 pointer-events-none hidden lg:block"></div>
      <div className="absolute top-1/4 right-12 w-20 h-20 border border-slate-200 rounded-full pointer-events-none hidden lg:block"></div>

      {/* Panel izquierdo - Hero */}
      <div className="hidden md:flex w-1/2 flex-col justify-center items-center relative z-10 p-12">
        <div className="flex flex-col items-center text-center max-w-lg">
          <img src="/worky-logo.png" alt="Worky" className="w-72 mb-6 drop-shadow-md" />
          <h1 className="text-slate-900 text-3xl lg:text-4xl font-extrabold uppercase tracking-tight leading-tight">
            Gestiona tus <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">proyectos</span>
          </h1>
          <p className="text-slate-600 mt-4 text-base font-medium leading-relaxed">
            La plataforma inteligente para emprendedores que quieren crecer y simplificar su gestión
          </p>
        </div>
      </div>

      {/* Quien llega desde un catálogo: se le dice con quién va a hablar */}
      {invitadoPor && (
        <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 shadow-md">
          {invitadoPor.avatar && (
            <img src={invitadoPor.avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/40" />
          )}
          <p className="text-sm font-semibold text-center">
            Crea tu cuenta y hablas directo con <span className="font-extrabold">{invitadoPor.name}</span>
          </p>
        </div>
      )}

      {/* Panel derecho - Formulario */}
      <div className="w-full md:w-1/2 flex items-center justify-center min-h-screen overflow-y-auto p-6 relative z-10" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="w-full max-w-md">
          {/* Logo visible en móvil */}
          <div className="md:hidden flex flex-col items-center mb-8 text-center">
            <img src="/worky-logo.png" alt="Worky" className="w-44 mb-3 drop-shadow-sm" />
            <h1 className="text-slate-900 text-xl font-extrabold uppercase tracking-tight">
              Gestiona tus <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">proyectos</span>
            </h1>
            <p className="text-slate-600 text-xs font-medium mt-1">
              La plataforma inteligente para emprendedores
            </p>
          </div>

          {/* Card de formulario */}
          <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200/90 shadow-2xl shadow-slate-200/60">
            <div className="mb-6 flex bg-slate-100 p-1 rounded-2xl">
              <button
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${authMode === 'login'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setAuthMode('login'); setError(''); }}
                disabled={authMode === 'login'}
              >
                Iniciar sesión
              </button>
              <button
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${authMode === 'register'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setAuthMode('register'); setError(''); }}
                disabled={authMode === 'register'}
              >
                Registrarse
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Nombre *</label>
                    <input
                      type="text"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                      placeholder={formularioCorto ? 'Ej. Juan Pérez' : 'Ej. Juan'}
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  {!formularioCorto && (
                    <div>
                      <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Apellidos *</label>
                      <input
                        type="text"
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                        placeholder="Ej. Pérez"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Correo electrónico *</label>
                    <input
                      type="email"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    {/* El selector de país se cae del formulario corto: el
                        indicativo se queda en el que ya trae por defecto. */}
                    {!formularioCorto && (
                      <div className="w-1/3">
                        <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">País</label>
                        <select
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition text-sm"
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
                    )}
                    <div className={formularioCorto ? 'w-full' : 'w-2/3'}>
                      <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Celular *</label>
                      <input
                        type="tel"
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                        placeholder={formularioCorto ? `${countryCode} 300 123 4567` : '3001234567'}
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Contraseña *</label>
                    <input
                      type="password"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                      placeholder="Mínimo 6 caracteres"
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
                    <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Correo electrónico</label>
                    <input
                      type="email"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Contraseña</label>
                    <input
                      type="password"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
              {error && (
                <div className="text-red-600 text-xs font-semibold bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation text-sm"></i>
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold text-base hover:shadow-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] mt-2"
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
            <div className="mt-6 text-center pt-4 border-t border-slate-100">
              <p className="text-slate-500 text-xs font-medium">
                {authMode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button
                  onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}
                  className="text-blue-600 hover:text-blue-700 font-bold transition ml-1"
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
