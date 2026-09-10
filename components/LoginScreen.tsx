import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../services/supabaseConfig';
import { setCurrentUserId } from '../services/messagingService';
import { llegoInvitado, vendedorPendiente } from '../services/catalogShareService';
import { URL_PRIVACIDAD, URL_TERMINOS, constanciaDeAceptacion } from '../utils/legal';
import { WORKY_APP_URL } from '../services/catalogShareService';
import { avatarDeIniciales } from '../utils/avatar';

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

/**
 * Si se enseña «Continuar con Google».
 *
 * En `false` hasta que el proveedor esté activado en Supabase → Authentication
 * → Providers → Google, con el ID y el secreto de Google Cloud pegados.
 *
 * No es prudencia de más: `signInWithOAuth` no falla en el navegador, sino que
 * se lleva a la persona a Supabase, y es allí donde revienta con un
 * «provider is not enabled» en JSON crudo y sin forma de volver. O sea que con
 * el proveedor apagado, el botón no da un error bonito: echa al cliente de la
 * aplicación. Comprobado el 10/09/2026.
 *
 * Encendido el 10/09/2026, después de comprobar contra el servidor que
 * `/auth/v1/authorize?provider=google` responde 302 hacia accounts.google.com
 * y no el 400 de antes.
 */
const GOOGLE_LISTO = true;

/**
 * La «G» de Google, dibujada aquí.
 *
 * Va en el código y no como icono de una tipografía porque sus normas de marca
 * exigen los cuatro colores exactos: el `fa-google` que ya está empaquetado es
 * de un solo color y no sirve. Dibujada tampoco pide nada por internet, así que
 * el botón se ve igual sin cobertura.
 */
const LogoGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" className="flex-shrink-0">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
  </svg>
);

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister, invitadoPor }) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+57');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  /**
   * Si aceptó la política y los términos. Nace apagado a propósito: la
   * autorización para tratar datos personales tiene que ser un acto de quien
   * se registra, y una casilla premarcada no lo es.
   */
  const [aceptaLegal, setAceptaLegal] = useState(false);
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

  // ── Recuperar la contraseña ────────────────────────────────────────────────
  //
  // No existía: quien perdía la contraseña perdía la cuenta, con todos sus
  // contactos y documentos dentro. Se pide el enlace aquí y la contraseña nueva
  // se pone al volver del correo, en NuevaContrasena.
  const [pidiendoEnlace, setPidiendoEnlace] = useState(false);
  const [enlaceEnviadoA, setEnlaceEnviadoA] = useState<string | null>(null);

  const pedirEnlaceDeRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    const correo = email.trim().toLowerCase();
    if (!correo) {
      setError('Escribe el correo con el que te registraste.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      // El destino es la app publicada y no el origen actual: desde el APK el
      // origen es el propio teléfono, y un enlace así no lleva a ninguna parte.
      // WORKY_APP_URL ya resuelve eso. El `?recuperar=1` es para reconocer la
      // vuelta en el primer pintado, antes de que Supabase lea el token.
      const { error: err } = await supabase.auth.resetPasswordForEmail(correo, {
        redirectTo: `${WORKY_APP_URL}/?recuperar=1`,
      });
      if (err) throw err;

      // Se confirma el envío haya cuenta o no. Decir «ese correo no existe»
      // convierte esta pantalla en una forma de averiguar quién está
      // registrado, y Supabase tampoco lo distingue en la respuesta.
      setEnlaceEnviadoA(correo);
    } catch (err: any) {
      console.error('Error pidiendo el enlace de recuperación:', err);
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const volverAlAcceso = () => {
    setPidiendoEnlace(false);
    setEnlaceEnviadoA(null);
    setError('');
  };

  // ── Entrar solo con un alias ───────────────────────────────────────────────
  //
  // El camino por defecto para quien escanea un QR. Escribe su nombre, el
  // servidor le ofrece tres aliases libres, elige uno y ya está en el chat: sin
  // correo, sin celular y sin contraseña.
  //
  // La cuenta que hay debajo es una sesión anónima de Supabase, que es una
  // cuenta de verdad y no un apaño. Lo que no tiene es forma de recuperarse: si
  // cambia de teléfono o borra los datos, pierde la conversación. Por eso la app
  // le pide el correo más tarde, ya dentro y sin bloquearle nada.
  const [nombreParaAlias, setNombreParaAlias] = useState('');
  /**
   * Cómo encontrar al invitado, si quiere dejarlo.
   *
   * Opcionales a propósito: pedirlos para entrar convertiría el atajo en el
   * formulario que se quiso evitar. Pero sin ellos el vendedor se queda con un
   * nombre y una conversación y nada más —hay catorce fichas así, sin teléfono
   * ni correo—, así que se piden aquí con la razón dicha.
   */
  const [correoInvitado, setCorreoInvitado] = useState('');
  const [celularInvitado, setCelularInvitado] = useState('');
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [aliasElegido, setAliasElegido] = useState('');
  const [buscandoAlias, setBuscandoAlias] = useState(false);
  // Con correo también se puede: el atajo no cierra la puerta de siempre.
  const [prefiereFormulario, setPrefiereFormulario] = useState(false);
  const entradaPorAlias = formularioCorto && authMode === 'register' && !prefiereFormulario;

  const pedirSugerencias = async () => {
    const nombre = nombreParaAlias.trim();
    if (!nombre) return;
    setError('');
    setBuscandoAlias(true);
    try {
      const { data, error: e } = await supabase.rpc('sugerir_alias', { p_nombre: nombre });
      if (e) throw e;
      const libres = (data as string[]) || [];
      if (!libres.length) throw new Error('No se encontró ningún alias libre. Prueba con otro nombre.');
      setSugerencias(libres);
      setAliasElegido(libres[0]);
    } catch (err: any) {
      console.error('sugerir_alias:', err);
      setError(err?.message || 'No se pudieron buscar aliases. Revisa tu conexión.');
    } finally {
      setBuscandoAlias(false);
    }
  };

  /**
   * Entrar con Google.
   *
   * No hace falta ninguna clave aquí: el ID y el secreto viven en Supabase, que
   * es quien habla con Google. Esto solo abre el camino.
   *
   * El destino es el origen actual y no la app publicada, al revés que en los
   * enlaces que se comparten: aquí se vuelve al mismo navegador donde se
   * empezó, así que mandarlo a otro sitio dejaría la sesión donde no está la
   * persona —y en local, sin poder probarlo—. Cada origen tiene que estar en
   * las Redirect URLs de Supabase.
   *
   * A quién le compró se conserva solo: `vendedorPendiente` vive en el
   * localStorage del navegador, que sobrevive al viaje de ida y vuelta.
   */
  const entrarConGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const { protocol, origin } = window.location;
      const destino = (protocol === 'http:' || protocol === 'https:') ? origin : WORKY_APP_URL;
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: destino },
      });
      if (e) throw e;
      // Si no lanza, el navegador ya se está yendo a Google: no se apaga el
      // «cargando», que apagarlo deja el botón como si no hubiera pasado nada.
    } catch (err: any) {
      console.error('Entrada con Google:', err);
      // El caso que de verdad pasa: el proveedor no está configurado todavía.
      const msg = String(err?.message ?? '').toLowerCase();
      setError(
        msg.includes('provider') || msg.includes('not enabled')
          ? 'Entrar con Google todavía no está habilitado. Actívalo en Supabase → Authentication → Providers → Google.'
          : getAuthErrorMessage(err),
      );
      setLoading(false);
    }
  };

  const entrarConAlias = async () => {
    if (!aliasElegido) return;
    setError('');
    setLoading(true);
    try {
      // El vendedor viaja también en la cuenta: quien llega por QR puede acabar
      // entrando desde otro navegador, y ahí el localStorage no existe.
      const vendedor = vendedorPendiente();
      const correo = correoInvitado.trim().toLowerCase();
      const celular = celularInvitado.trim();
      const { data, error: e } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            alias: aliasElegido,
            // Van en la metadata de la cuenta y no en `email`/`phone`: esos
            // campos de auth exigen verificación y la cuenta dejaría de ser
            // anónima a medias. Aquí son solo la forma de que el vendedor le
            // encuentre, y viajan al alta para acabar en su ficha.
            ...(correo ? { correo_contacto: correo } : {}),
            ...(celular ? { celular_contacto: celular } : {}),
            ...(vendedor ? { vendedor } : {}),
          },
        },
      });
      if (e) throw e;
      if (!data.user) throw new Error('No se pudo crear la sesión.');

      // Reservar va después de tener sesión: la función necesita saber quién
      // pide el alias. Si otro se le adelantó en estos segundos, falla aquí y se
      // le vuelven a ofrecer sugerencias en vez de dejarle a medias.
      const { data: alias, error: e2 } = await supabase.rpc('reservar_alias', { p_alias: aliasElegido });
      if (e2) {
        await supabase.auth.signOut();
        throw e2;
      }

      setCurrentUserId(data.user.id, alias as string);
      // El correo y el celular, si los dejó, siguen el mismo camino que en el
      // alta normal: acaban en su perfil y de ahí en la ficha que ve quien le
      // vende. El alias hace de nombre.
      onRegister(correo, celular, alias as string);
    } catch (err: any) {
      console.error('Entrada por alias:', err);
      const tomado = /ya está tomado/i.test(err?.message || '');
      setError(tomado ? 'Ese alias lo acaban de tomar. Elige otro.' : getAuthErrorMessage(err));
      if (tomado) void pedirSugerencias();
    } finally {
      setLoading(false);
    }
  };

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

        // Sin autorización no se crea la cuenta. No es un formalismo: es lo
        // que la Ley 1581 pide antes de tratar los datos de nadie.
        if (!aceptaLegal) {
          setError('Para crear la cuenta hay que aceptar la Política de Datos y los Términos.');
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
            // La constancia de la aceptación viaja con el alta y queda en la
            // cuenta: el titular puede pedir prueba de la autorización que
            // dio, y aquí sobrevive aunque no llegue a confirmar el correo.
            data: {
              full_name: fullName,
              phone: fullPhone,
              ...constanciaDeAceptacion(),
              ...(vendedor ? { vendedor } : {}),
            },
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
              avatar_url: avatarDeIniciales(fullName),
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
            {/* Recuperar la contraseña. Ocupa la tarjeta entera: quien llega
                aquí tiene un solo problema, y las pestañas de acceso y
                registro no le sirven para nada ahora mismo. */}
            {pidiendoEnlace ? (
              enlaceEnviadoA ? (
                <div className="space-y-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                    <i className="fa-solid fa-envelope-circle-check text-emerald-600 text-xl"></i>
                  </div>
                  <div>
                    <h2 className="text-slate-900 text-lg font-extrabold">Revisa tu correo</h2>
                    <p className="text-slate-500 text-sm mt-1">
                      Si <span className="font-bold text-slate-700">{enlaceEnviadoA}</span> tiene una
                      cuenta en Worky, le acaba de llegar un enlace para poner una contraseña nueva.
                    </p>
                  </div>
                  {/* Lo que más pasa, y por eso se dice antes de que llame a
                      soporte: el correo cae en «no deseado». */}
                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 leading-snug">
                    Si no lo ves en unos minutos, míralo en <span className="font-bold">correo no deseado</span>.
                    El enlace caduca en una hora.
                  </p>
                  <button
                    type="button"
                    onClick={volverAlAcceso}
                    className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
                  >
                    Volver a iniciar sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={pedirEnlaceDeRecuperacion} className="space-y-4">
                  <div>
                    <h2 className="text-slate-900 text-lg font-extrabold">¿Olvidaste tu contraseña?</h2>
                    <p className="text-slate-500 text-sm mt-1">
                      Escribe tu correo y te mandamos un enlace para poner una nueva.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-700 font-bold uppercase mb-1.5 block tracking-wide">Correo electrónico</label>
                    <input
                      type="email"
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  {error && (
                    <div className="text-red-600 text-xs font-semibold bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                      <i className="fa-solid fa-circle-exclamation text-sm"></i>
                      <span>{error}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold text-base hover:shadow-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                    disabled={loading}
                  >
                    {loading ? 'Enviando...' : 'Enviarme el enlace'}
                  </button>
                  <button
                    type="button"
                    onClick={volverAlAcceso}
                    className="w-full text-slate-500 hover:text-slate-700 text-xs font-bold transition"
                  >
                    Volver
                  </button>
                </form>
              )
            ) : (
            <>
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

            {/* Entrada por alias: lo primero que ve quien llega de un QR. */}
            {entradaPorAlias && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-slate-900 text-lg font-extrabold">¿Cómo te llamas?</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    Con tu nombre basta para empezar a chatear
                    {invitadoPor ? <> con <span className="font-bold text-slate-700">{invitadoPor.name}</span></> : null}.
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 font-semibold rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                    placeholder="Ej. Jersson Escobar"
                    value={nombreParaAlias}
                    onChange={e => { setNombreParaAlias(e.target.value); setSugerencias([]); setError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void pedirSugerencias(); } }}
                    autoFocus
                  />
                </div>

                {!sugerencias.length ? (
                  <button
                    type="button"
                    onClick={() => void pedirSugerencias()}
                    disabled={!nombreParaAlias.trim() || buscandoAlias}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold text-base hover:shadow-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                  >
                    {buscandoAlias ? 'Buscando nombres libres…' : 'Continuar'}
                  </button>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-slate-700 font-bold uppercase mb-2 tracking-wide">Elige tu nombre de usuario</p>
                      <div className="space-y-2">
                        {sugerencias.map(s => (
                          <button
                            type="button"
                            key={s}
                            onClick={() => { setAliasElegido(s); setError(''); }}
                            className={`w-full text-left p-3.5 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-between ${
                              aliasElegido === s
                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span>@{s}</span>
                            {aliasElegido === s && <i className="fa-solid fa-circle-check text-blue-600"></i>}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => void pedirSugerencias()}
                        disabled={buscandoAlias}
                        className="text-blue-600 hover:text-blue-700 text-xs font-bold mt-2.5 disabled:opacity-50"
                      >
                        <i className="fa-solid fa-rotate mr-1"></i>
                        Ninguno me gusta, sugiere otros
                      </button>
                    </div>

                    {/* El correo y el celular, opcionales y con la razón dicha.
                        No se piden para dejarle entrar —el alias basta— sino
                        porque sin ellos la conversación no se recupera y quien
                        vende se queda sin forma de buscarle: hoy hay catorce
                        conversaciones así, sin un solo número. */}
                    <div className="space-y-2.5 pt-1">
                      <p className="text-[11px] text-slate-500 leading-snug bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                        <i className="fa-solid fa-circle-info text-amber-500 mr-1.5"></i>
                        Déjanos cómo encontrarte. Si no,{' '}
                        <span className="font-bold text-amber-900">
                          al cambiar de teléfono pierdes esta conversación
                        </span>{' '}
                        y no hay forma de recuperarla.
                      </p>
                      <input
                        type="email"
                        value={correoInvitado}
                        onChange={e => setCorreoInvitado(e.target.value)}
                        placeholder="Correo (opcional)"
                        autoComplete="email"
                        className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-medium rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                      />
                      <input
                        type="tel"
                        value={celularInvitado}
                        onChange={e => setCelularInvitado(e.target.value)}
                        placeholder="Celular (opcional)"
                        autoComplete="tel"
                        inputMode="tel"
                        className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 font-medium rounded-xl outline-none focus:border-blue-600 focus:bg-white transition placeholder-slate-400 text-sm"
                      />
                    </div>

                    {error && (
                      <div className="text-red-600 text-xs font-semibold bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                        <i className="fa-solid fa-circle-exclamation text-sm"></i>
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => void entrarConAlias()}
                      disabled={loading || !aliasElegido}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold text-base hover:shadow-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                    >
                      {loading ? 'Entrando…' : <>Entrar como @{aliasElegido}</>}
                    </button>
                  </>
                )}

                {error && !sugerencias.length && (
                  <div className="text-red-600 text-xs font-semibold bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                    <i className="fa-solid fa-circle-exclamation text-sm"></i>
                    <span>{error}</span>
                  </div>
                )}

                {/* Google, como atajo al registro de verdad. Aquí vale doble:
                    quien entra así queda con cuenta recuperable y con su correo
                    desde el primer momento, sin escribir una contraseña. */}
                {GOOGLE_LISTO && (
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <p className="text-center text-[11px] text-slate-400 font-semibold">o</p>
                  <button
                    type="button"
                    onClick={() => void entrarConGoogle()}
                    disabled={loading}
                    className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition flex items-center justify-center gap-2.5 disabled:opacity-50"
                  >
                    <LogoGoogle />
                    Continuar con Google
                  </button>
                  <p className="text-[11px] text-slate-400 text-center leading-snug">
                    Así no pierdes la conversación aunque cambies de teléfono.
                  </p>
                </div>
                )}

                {/* La nota de «podrás añadir tu correo más adelante» vivía aquí.
                    Sobra desde que el correo se pide arriba, y decir dos veces
                    lo mismo en la misma pantalla lo vuelve ruido. */}
                <div className="text-center pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setPrefiereFormulario(true); setError(''); }}
                    className="text-slate-500 hover:text-slate-700 text-xs font-semibold"
                  >
                    Prefiero registrarme con correo
                  </button>
                </div>
              </div>
            )}

            {!entradaPorAlias && (
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
                    {/* Va aquí debajo y no en el pie: se busca en el momento en
                        que la contraseña no entra, mirando este campo. */}
                    <button
                      type="button"
                      onClick={() => { setPidiendoEnlace(true); setError(''); }}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-xs font-bold transition"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </>
              )}
              {/* La autorización para tratar sus datos. Va con los enlaces al
                  lado, no detrás de un «leer más»: se acepta lo que se puede
                  leer sin salir de aquí. */}
              {authMode === 'register' && (
                <label className="flex items-start gap-2.5 cursor-pointer select-none bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <input
                    type="checkbox"
                    checked={aceptaLegal}
                    onChange={e => setAceptaLegal(e.target.checked)}
                    className="mt-0.5 w-4 h-4 flex-shrink-0 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-[11px] leading-snug text-slate-600">
                    He leído y acepto la{' '}
                    <a
                      href={URL_PRIVACIDAD}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Política de Tratamiento de Datos
                    </a>{' '}
                    y los{' '}
                    <a
                      href={URL_TERMINOS}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Términos y Condiciones
                    </a>
                    , y autorizo el tratamiento de mis datos personales.
                  </span>
                </label>
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
            )}

            {/* Google, también en el formulario de siempre. Va fuera del <form>
                para que no lo dispare un Enter: se entra con lo que se escribió
                arriba, no con otra cuenta sin querer. */}
            {GOOGLE_LISTO && !entradaPorAlias && !pendingEmailConfirmation && (
              <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
                <p className="text-center text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
                  o continúa con
                </p>
                <button
                  type="button"
                  onClick={() => void entrarConGoogle()}
                  disabled={loading}
                  className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  <LogoGoogle />
                  Continuar con Google
                </button>
              </div>
            )}

            {/* Footer */}
            {!entradaPorAlias && (
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
              {/* Volver al atajo: quien pulsó "prefiero con correo" y se
                  arrepiente no tiene por qué recargar la página. */}
              {formularioCorto && prefiereFormulario && authMode === 'register' && (
                <button
                  onClick={() => { setPrefiereFormulario(false); setError(''); }}
                  className="text-slate-500 hover:text-slate-700 text-xs font-semibold mt-3"
                >
                  <i className="fa-solid fa-arrow-left mr-1"></i>
                  Entrar solo con un nombre de usuario
                </button>
              )}
            </div>
            )}
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
