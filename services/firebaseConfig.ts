import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoKey123",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "worky-demo.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://worky-demo-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "worky-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "worky-demo.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// Initialize Firebase - solo si no existe ya una instancia
let app: FirebaseApp | null = null;
let database: any = null;
let auth: any = null;
let storage: any = null;

// Verificar si las credenciales son reales o demo
const isDemoConfig = firebaseConfig.apiKey === "AIzaSyDemoKey123" || 
                     firebaseConfig.projectId === "worky-demo";

// Función para verificar conexión
export const checkFirebaseConnection = (): { connected: boolean; isDemo: boolean; error?: string } => {
  if (isDemoConfig) {
    return { connected: false, isDemo: true, error: 'Configuración demo detectada. Configura Firebase en .env.local' };
  }
  
  if (!app) {
    return { connected: false, isDemo: false, error: 'Firebase no inicializado' };
  }
  
  if (!database) {
    return { connected: false, isDemo: false, error: 'Database no disponible' };
  }
  
  return { connected: true, isDemo: false };
};

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('🔥 Firebase inicializado:', isDemoConfig ? '⚠️ MODO DEMO' : '✅ PRODUCCIÓN');
  } else {
    app = getApp();
  }
  
  // Initialize services solo si la app se inicializó correctamente
  if (app) {
    try {
      database = getDatabase(app);
      if (!isDemoConfig) {
        console.log('✅ Firebase Realtime Database conectado');
      }
    } catch (e) {
      console.warn('Error inicializando Database:', e);
    }
    
    try {
      auth = getAuth(app);
      if (!isDemoConfig) {
        console.log('✅ Firebase Authentication configurado');
      }
    } catch (e) {
      console.warn('Error inicializando Auth:', e);
    }
    
    try {
      storage = getStorage(app);
      if (!isDemoConfig) {
        console.log('✅ Firebase Storage configurado');
      }
    } catch (e) {
      console.warn('Error inicializando Storage:', e);
    }
  }
} catch (error) {
  console.error('❌ Error inicializando Firebase:', error);
  // La app puede continuar sin Firebase en modo offline
}

export { database, auth, storage, isDemoConfig };
export default app;
