import { supabase } from './supabaseConfig';

export interface AdminProfileRow {
  id: string;
  businessName: string;
  ownerName: string;
  email: string | null;
  phone: string | null;
  isPro: boolean;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
}

// Solo devuelve filas si el usuario autenticado tiene is_admin = true en
// user_profiles: la RLS "user_profiles_select_admin" es quien decide esto,
// no el cliente. Un usuario normal simplemente recibe su propia fila.
export const listAllUserProfiles = async (): Promise<AdminProfileRow[]> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, business_name, owner_name, email, phone, is_pro, trial_ends_at, subscription_ends_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`No se pudo cargar la lista de usuarios: ${error.message}`);

  return (data || []).map((row) => ({
    id: row.id,
    businessName: row.business_name,
    ownerName: row.owner_name,
    email: row.email,
    phone: row.phone,
    isPro: row.is_pro,
    trialEndsAt: row.trial_ends_at,
    subscriptionEndsAt: row.subscription_ends_at,
  }));
};

export const adminSetPro = async (userId: string, isPro: boolean): Promise<void> => {
  const { error } = await supabase.from('user_profiles').update({ is_pro: isPro }).eq('id', userId);
  if (error) throw new Error(`No se pudo actualizar el estado Pro: ${error.message}`);
};

export const adminSetSubscriptionEndsAt = async (userId: string, isoDate: string | null): Promise<void> => {
  const { error } = await supabase
    .from('user_profiles')
    .update({ subscription_ends_at: isoDate })
    .eq('id', userId);
  if (error) throw new Error(`No se pudo actualizar la fecha de vencimiento: ${error.message}`);
};
