import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { 
  signInWithEmailLink, 
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { auth } from './firebaseConfig';

// Para verificación por teléfono
let confirmationResult: ConfirmationResult | null = null;

export const authService = {
  /**
   * Enviar link de verificación al email
   */
  async sendEmailVerification(email: string): Promise<void> {
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Guardar el email en localStorage para verificar después
    localStorage.setItem('emailForSignIn', email);
  },

  /**
   * Verificar el código del email y hacer login
   */
  async verifyEmailCode(email: string): Promise<any> {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      localStorage.removeItem('emailForSignIn');
      return result.user;
    }
    throw new Error('Link inválido');
  },

  /**
   * Enviar código SMS al teléfono
   */
  async sendPhoneVerification(phoneNumber: string, recaptchaContainer: string): Promise<void> {
    try {
      // Para web, necesitamos reCAPTCHA
      const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
        size: 'invisible',
      });

      confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    } catch (error) {
      console.error('Error enviando SMS:', error);
      throw error;
    }
  },

  /**
   * Verificar el código SMS
   */
  async verifyPhoneCode(code: string): Promise<any> {
    if (!confirmationResult) {
      throw new Error('No se ha enviado código de verificación');
    }

    const result = await confirmationResult.confirm(code);
    return result.user;
  },

  /**
   * Método nativo para móvil usando el plugin de Capacitor
   */
  async signInWithPhoneNative(phoneNumber: string): Promise<any> {
    const result = await FirebaseAuthentication.signInWithPhoneNumber({
      phoneNumber,
    });
    return result;
  },

  /**
   * Verificar código SMS en móvil
   */
  async verifyPhoneCodeNative(verificationId: string, verificationCode: string): Promise<any> {
    const result = await FirebaseAuthentication.confirmVerificationCode({
      verificationId,
      verificationCode,
    });
    return result.user;
  },

  /**
   * Obtener usuario actual
   */
  async getCurrentUser(): Promise<any> {
    const result = await FirebaseAuthentication.getCurrentUser();
    return result.user;
  },

  /**
   * Cerrar sesión
   */
  async signOut(): Promise<void> {
    await FirebaseAuthentication.signOut();
  }
};
