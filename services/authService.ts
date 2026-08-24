import { supabase } from './supabaseConfig';

export const authService = {
  /**
   * Enviar OTP al email
   */
  async sendEmailVerification(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.href,
      },
    });

    if (error) throw error;
    localStorage.setItem('emailForSignIn', email);
  },

  /**
   * Verificar el código del email y hacer login
   */
  async verifyEmailCode(email: string, token: string): Promise<any> {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;
    localStorage.removeItem('emailForSignIn');
    return data.user;
  },

  /**
   * Enviar código SMS para verificar/adjuntar un celular a la sesión YA
   * autenticada (signUp con email/password). updateUser({phone}), no
   * signInWithOtp: este último crearía una cuenta nueva ligada al
   * teléfono en vez de verificar el teléfono de la cuenta actual.
   */
  async sendPhoneVerification(phoneNumber: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ phone: phoneNumber });
    if (error) throw error;
    localStorage.setItem('phoneForSignIn', phoneNumber);
  },

  /**
   * Confirmar el código SMS. type: 'phone_change' porque el teléfono se
   * está adjuntando a una cuenta existente (ver sendPhoneVerification),
   * no iniciando sesión con teléfono desde cero (eso sería type: 'sms').
   */
  async verifyPhoneCode(phoneNumber: string, token: string): Promise<any> {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'phone_change',
    });

    if (error) throw error;
    localStorage.removeItem('phoneForSignIn');
    return data.user;
  },

  /**
   * Obtener usuario actual
   */
  async getCurrentUser(): Promise<any> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  /**
   * Cerrar sesión
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Escuchar cambios de autenticación
   */
  onAuthStateChange(callback: (user: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  },
};
