/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Sin credenciales la app arrancaba igual y fallaba después con errores
// crípticos de red. Mejor gritar aquí.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.\n' +
      'Vite carga .env.local con prioridad sobre .env: define ambas ahí.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const checkSupabaseConnection = (): { connected: boolean; error?: string } => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { connected: false, error: 'Supabase no configurado (revisa .env.local)' };
  }
  return { connected: true };
};

export default supabase;
