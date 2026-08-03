import { supabase, uniqueTopic } from './supabaseConfig';
import { Message, Contact } from '../types';

// ============ IDENTIDAD ============

// Cache del uid en memoria. Se rellena desde la sesión de Supabase.
let currentUserId: string | null = null;

export const initializeUserId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  currentUserId = data.user.id;
  await registerUserInIndex(data.user.id, data.user.email || data.user.phone || '');
  return currentUserId;
};

export const getCurrentUserId = (): string => {
  if (!currentUserId) throw new Error('Usuario no autenticado');
  return currentUserId;
};

export const setCurrentUserId = (userId: string, phoneOrEmail?: string) => {
  currentUserId = userId;
  if (phoneOrEmail) void registerUserInIndex(userId, phoneOrEmail);
};

// Normaliza igual al escribir y al buscar; si difieren, la búsqueda nunca encuentra.
const toSafeKey = (raw: string) =>
  raw.replace(/\s+/g, '').toLowerCase().replace(/[\.\#\$\[\]]/g, '_');

const registerUserInIndex = async (userId: string, phoneOrEmail: string) => {
  if (!phoneOrEmail) return;
  const normalized = phoneOrEmail.replace(/\s+/g, '').toLowerCase();

  try {
    await supabase
      .from('user_index')
      .upsert({ safe_key: toSafeKey(phoneOrEmail), user_id: userId }, { onConflict: 'safe_key' });

    await supabase
      .from('public_info')
      .upsert({ user_id: userId, phone_or_email: normalized }, { onConflict: 'user_id' });
  } catch (error) {
    console.error('Error registrando usuario en índice:', error);
  }
};

// ============ UTILIDADES ============

// Determinista y simétrico: ambos extremos calculan el MISMO id.
// De esto depende que no haya "chats cruzados".
export function getChatId(userId1: string, userId2: string): string {
  if (!userId1 || !userId2) throw new Error('getChatId: Ambos UIDs son requeridos');
  return [userId1, userId2].sort().join('_');
}

// 'me' / 'other' es relativo a quien mira, así que NO se persiste:
// se deriva comparando contra el uid propio en cada lectura.
const rowToMessage = (row: any, myUid: string): Message => {
  let metadata = row.metadata ?? undefined;
  if (row.media_url && !metadata) {
    metadata = {
      url: row.media_url,
      fileName: row.text || 'Archivo adjunto',
      fileType: row.media_type || 'application/octet-stream',
      fileSize: 0,
    };
  }
  return {
    id: row.id,
    text: row.text,
    sender: row.sender_id === myUid ? 'me' : 'other',
    timestamp: new Date(row.timestamp),
    type: row.type,
    metadata,
    isPaid: row.is_paid ?? undefined,
    paidDate: row.paid_date ? new Date(row.paid_date) : undefined,
    mediaUrl: row.media_url ?? undefined,
    mediaType: row.media_type ?? undefined,
  };
};

// ============ MENSAJES ============

export const sendMessage = async (
  contactId: string,
  message: Omit<Message, 'id'>
): Promise<string> => {
  const userId = getCurrentUserId();
  const chatId = getChatId(userId, contactId);

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: userId,
      recipient_id: contactId,
      text: message.text,
      type: message.type,
      metadata: message.metadata ?? null,
      timestamp: new Date().toISOString(),
      media_url: message.mediaUrl ?? null,
      media_type: message.mediaType ?? null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error enviando mensaje:', error);
    throw error;
  }

  // Mi lado: leído. Lado del otro: +1 no leído (vía RPC, porque RLS
  // no me deja escribir en la fila de otro usuario).
  await supabase
    .from('user_chats')
    .upsert(
      {
        user_id: userId,
        contact_id: contactId,
        last_message: message.text,
        last_message_time: new Date().toISOString(),
        unread: 0,
      },
      { onConflict: 'user_id,contact_id' }
    );

  const { error: rpcError } = await supabase.rpc('bump_unread', {
    p_recipient: contactId,
    p_last: message.text,
  });
  if (rpcError) console.warn('No se pudo actualizar no-leídos del destinatario:', rpcError.message);

  return data.id;
};

export const listenToMessages = (
  contactId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const userId = getCurrentUserId();
  const chatId = getChatId(userId, contactId);

  // Estado local para poder anexar en vez de re-consultar en cada evento.
  let buffer: Message[] = [];
  let cancelled = false;

  const emit = () => {
    if (!cancelled) callback([...buffer]);
  };

  const loadInitial = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error cargando mensajes:', error);
      return;
    }
    if (cancelled) return;

    buffer = (data || []).map((row) => rowToMessage(row, userId));
    emit();
  };

  // API Realtime de supabase-js v2: channel + postgres_changes.
  // uniqueTopic: reabrir el mismo chat antes de que el canal anterior
  // termine de cerrarse no debe reutilizar la instancia ya suscrita.
  const channel = supabase
    .channel(uniqueTopic(`chat:${chatId}`))
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        const incoming = rowToMessage(payload.new, userId);
        // El INSERT propio también rebota por aquí: deduplicar por id.
        if (buffer.some((m) => m.id === incoming.id)) return;
        buffer = [...buffer, incoming].sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
        );
        emit();

        // ── NOTIFICACIONES WEB Y TOASTS ──
        const senderId = payload.new.sender_id || payload.new.user_id;
        if (senderId && senderId !== userId) {
          const isMedia = payload.new.type === 'image' || payload.new.type === 'file' || !!payload.new.media_url;
          const bodyText = isMedia ? 'Archivo recibido' : (payload.new.text || '');

          // Notificación del navegador
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Nuevo mensaje', {
                body: bodyText,
                icon: '/worky-logo 2.png',
                tag: senderId,
              });
            } catch (err) {
              console.warn('No se pudo mostrar la notificación nativa:', err);
            }
          }

          // Evento global para in-app toast
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('worky-new-message', {
              detail: {
                id: payload.new.id,
                text: bodyText,
                type: payload.new.type,
                mediaUrl: payload.new.media_url,
                senderId: senderId,
              }
            });
            window.dispatchEvent(event);
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        const incoming = rowToMessage(payload.new, userId);
        buffer = buffer.map((m) => (m.id === incoming.id ? incoming : m));
        emit();
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        const deletedId = payload.old.id;
        buffer = buffer.filter((m) => m.id !== deletedId);
        emit();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Chat] Suscrito en tiempo real a', chatId);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('[Chat] Fallo de suscripción realtime:', status);
      }
    });

  void loadInitial();

  return () => {
    cancelled = true;
    void supabase.removeChannel(channel);
  };
};

export const markChatAsRead = async (contactId: string): Promise<void> => {
  const userId = getCurrentUserId();
  await supabase
    .from('user_chats')
    .update({ unread: 0 })
    .eq('user_id', userId)
    .eq('contact_id', contactId);
};

export const updateMessage = async (
  messageId: string,
  updates: Partial<Message>
): Promise<void> => {
  const payload: any = {};
  if (updates.isPaid !== undefined) {
    payload.is_paid = updates.isPaid;
  }
  if (updates.paidDate !== undefined) {
    payload.paid_date = updates.paidDate ? updates.paidDate.toISOString() : null;
  }
  if (updates.metadata !== undefined) {
    payload.metadata = updates.metadata;
  }
  if (updates.text !== undefined) {
    payload.text = updates.text;
  }
  if (updates.type !== undefined) {
    payload.type = updates.type;
  }

  const { error } = await supabase
    .from('messages')
    .update(payload)
    .eq('id', messageId);

  if (error) {
    console.error('Error actualizando mensaje:', error);
    throw error;
  }
};

export const deleteMessage = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error al eliminar mensaje:', error);
    throw error;
  }
};

// ============ CONTACTOS ============

// contact_user_id es el uid real del otro usuario y es lo único
// válido para abrir un chat. El id de la fila NO sirve para eso.
const rowToContact = (row: any): Contact => ({
  id: row.contact_user_id ?? row.id,
  clientName: row.client_name,
  avatar: row.avatar,
  phone: row.phone,
  status: row.status,
  role: row.role,
  projects: [],
  lastMessage: row.last_message || '',
  lastMessageTime: row.last_message_time ? new Date(row.last_message_time) : new Date(),
  unreadCount: row.unread_count || 0,
  notes: row.notes ?? undefined,
});

export const addContact = async (contact: Contact): Promise<void> => {
  // Alta mutua vía RPC SECURITY DEFINER (add_contact_mutual): el cliente NO
  // puede insertar una fila de contacts en nombre del otro usuario (el RLS
  // "auth.uid() = user_id" lo bloquea, y así debe ser). Sin esto, mi fila
  // se guardaba pero la del otro fallaba, y el otro usuario nunca veía el
  // contacto ni podía leer los mensajes que sí llegaban a la tabla `messages`.
  const { error } = await supabase.rpc('add_contact_mutual', {
    p_other_user: contact.id,
    p_client_name: contact.clientName,
    p_avatar: contact.avatar ?? null,
    p_phone: contact.phone ?? null,
    p_status: contact.status,
    p_role: contact.role,
  });

  if (error) {
    if (error.message.includes('function public.add_contact_mutual') || error.code === '42883') {
      throw new Error('Falta aplicar supabase_contacts_mutual_rpc.sql en Supabase.');
    }
    throw error;
  }
};

export const listenToContacts = (
  callback: (contacts: Contact[]) => void
): (() => void) => {
  const userId = getCurrentUserId();
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error cargando contactos:', error);
      return;
    }
    if (!cancelled) callback((data || []).map(rowToContact));
  };

  const channel = supabase
    .channel(uniqueTopic(`contacts:${userId}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'contacts', filter: `user_id=eq.${userId}` },
      () => void load()
    )
    .subscribe();

  void load();

  return () => {
    cancelled = true;
    void supabase.removeChannel(channel);
  };
};

export const deleteContact = async (contactId: string): Promise<void> => {
  const userId = getCurrentUserId();

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('user_id', userId)
    .eq('contact_user_id', contactId);
  if (error) throw error;

  await supabase
    .from('user_chats')
    .delete()
    .eq('user_id', userId)
    .eq('contact_id', contactId);
};

export const updateContactStatus = async (): Promise<void> => {
  // Presencia en línea: pendiente de reimplementar con supabase.channel().track().
};

// ============ PERFIL ============

export const saveUserProfile = async (profile: any): Promise<void> => {
  const userId = getCurrentUserId();

  // Guardar perfil privado en user_profiles. Esto NO debe fallar.
  const { error: profileError } = await supabase.from('user_profiles').upsert(
    {
      id: userId,
      business_name: profile.businessName,
      owner_name: profile.ownerName,
      phone: profile.phone,
      business_type: profile.businessType,
      business_logo: profile.businessLogo,
      profile_photo: profile.profilePhoto,
      // username tiene constraint UNIQUE. Un '' cuenta como valor y colisiona
      // entre usuarios; NULL no (Postgres permite múltiples NULL en unique).
      username: profile.username?.trim() || null,
      email: profile.email?.trim().toLowerCase() || null,
      nit: profile.nit,
      address: profile.address,
      city: profile.city,
      country: profile.country,
    },
    { onConflict: 'id' }
  );
  if (profileError) {
    // 23505 = unique_violation. Si es el username, decirlo en cristiano.
    if (profileError.code === '23505' && profileError.message.includes('username')) {
      throw new Error('Ese nombre de usuario ya está en uso. Elige otro.');
    }
    throw new Error(`Fallo al guardar perfil: ${profileError.message}`);
  }

  // Espeja nombre y avatar en public_info para que otros puedan encontrarte.
  // Si falla, se logguea pero no aborta: la tabla privada ya guardó.
  const { error: publicError } = await supabase.from('public_info').upsert(
    {
      user_id: userId,
      phone_or_email: (profile.email || profile.phone || '').toLowerCase(),
      display_name: profile.businessName || profile.ownerName,
      avatar_url: profile.businessLogo || profile.profilePhoto,
    },
    { onConflict: 'user_id' }
  );
  if (publicError) {
    console.warn('Fallo al actualizar public_info (no crítico):', publicError.message);
  }
};

export const getUserProfile = (callback: (profile: any) => void): (() => void) => {
  const userId = getCurrentUserId();
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (cancelled) return;
    if (error) {
      // Fallo de lectura (red, RLS). callback(null) manda al usuario al
      // setup en vez de dejar la pantalla en negro; el log distingue este
      // caso de "el perfil no existe".
      console.error('Error leyendo user_profiles:', error.message);
    }
    if (!data) {
      callback(null);
      return;
    }

    callback({
      businessName: data.business_name,
      ownerName: data.owner_name,
      phone: data.phone,
      businessType: data.business_type,
      businessLogo: data.business_logo,
      profilePhoto: data.profile_photo,
      username: data.username,
      email: data.email,
      nit: data.nit,
      address: data.address,
      city: data.city,
      country: data.country,
      isPro: data.is_pro ?? false,
      trialEndsAt: data.trial_ends_at ?? null,
      subscriptionEndsAt: data.subscription_ends_at ?? null,
      isAdmin: data.is_admin ?? false,
    });
  };

  // uniqueTopic: onAuthStateChange puede re-suscribir en rápida sucesión;
  // el canal viejo aún vive cuando nace el nuevo y el topic NO debe chocar.
  const channel = supabase
    .channel(uniqueTopic(`profile:${userId}`))
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_profiles', filter: `id=eq.${userId}` },
      () => void load()
    )
    .subscribe();

  void load();

  return () => {
    cancelled = true;
    void supabase.removeChannel(channel);
  };
};

// ============ BÚSQUEDA DE USUARIOS ============

export const searchUserByPhoneOrEmail = async (
  phoneOrEmail: string
): Promise<{ userId: string; name?: string; avatar?: string; phone?: string } | null> => {
  if (!phoneOrEmail?.trim()) return null;

  // public_info guarda el identificador ya normalizado en minúsculas,
  // así que la búsqueda normaliza igual. Si difieren, no encuentra nada.
  const term = phoneOrEmail.trim().toLowerCase();

  const buildResult = (row: any) => {
    const name = row.display_name || 'Usuario';
    return {
      userId: row.user_id,
      name,
      avatar:
        row.avatar_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      phone: row.phone_or_email || term,
    };
  };

  const columns = 'user_id, display_name, avatar_url, phone_or_email';

  // 1) Coincidencia exacta por correo (o teléfono tal cual se guardó).
  const { data: exact, error } = await supabase
    .from('public_info')
    .select(columns)
    .eq('phone_or_email', term)
    .maybeSingle();

  if (error) console.warn('Búsqueda en public_info:', error.message);

  if (exact) {
    return exact.user_id === currentUserId ? null : buildResult(exact);
  }

  // 2) Teléfonos: el usuario puede escribirlos con espacios o guiones
  //    y guardarse sin ellos (o al revés).
  const compact = term.replace(/[\s\-()]/g, '');
  if (compact !== term) {
    const { data: byPhone } = await supabase
      .from('public_info')
      .select(columns)
      .eq('phone_or_email', compact)
      .maybeSingle();
    if (byPhone) {
      return byPhone.user_id === currentUserId ? null : buildResult(byPhone);
    }
  }

  // 3) Compatibilidad: cuentas registradas antes del trigger quedaron
  //    solo en user_index con las claves "escapadas" al estilo Firebase.
  const { data: legacy } = await supabase
    .from('user_index')
    .select('user_id')
    .eq('safe_key', toSafeKey(phoneOrEmail))
    .maybeSingle();

  if (!legacy) return null;
  if (legacy.user_id === currentUserId) return null;

  const { data: pub } = await supabase
    .from('public_info')
    .select(columns)
    .eq('user_id', legacy.user_id)
    .maybeSingle();

  return pub ? buildResult(pub) : { userId: legacy.user_id, name: 'Usuario', phone: term };
};

export const addContactFromSearch = async (foundUser: {
  userId: string;
  name?: string;
  avatar?: string;
  phone?: string;
}): Promise<Contact> => {
  const userId = getCurrentUserId();

  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('contact_user_id', foundUser.userId)
    .maybeSingle();

  if (existing) throw new Error('Este usuario ya está en tus contactos');

  const name = foundUser.name || 'Usuario';
  const newContact: Contact = {
    id: foundUser.userId,
    clientName: name,
    avatar:
      foundUser.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    phone: foundUser.phone || '',
    status: 'Lead' as any,
    role: 'client',
    projects: [],
    lastMessage: 'Nuevo contacto',
    lastMessageTime: new Date(),
    unreadCount: 0,
  };

  await addContact(newContact);
  return newContact;
};
