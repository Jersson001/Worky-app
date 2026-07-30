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
   * Enviar OTP al teléfono (WhatsApp)
   */
  async sendPhoneVerification(phoneNumber: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        channel: 'whatsapp', // Usar WhatsApp para enviar OTP
      },
    });

    if (error) throw error;
    localStorage.setItem('phoneForSignIn', phoneNumber);
  },

  /**
   * Verificar el código del teléfono
   */
  async verifyPhoneCode(phoneNumber: string, token: string): Promise<any> {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'sms',
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
