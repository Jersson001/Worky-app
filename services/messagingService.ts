import { supabase, uniqueTopic } from './supabaseConfig';
import { Message, Contact, UserStatus } from '../types';

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
    status: row.status ?? 'sent',
  };
};

// ============ MENSAJES ============

/**
 * Quién es usuario de Worky y quién es una ficha creada a mano.
 *
 * Hace falta al mandar: `messages.recipient_id` es uuid con clave foránea a
 * `auth.users`, así que poner ahí el id de un contacto manual hace que la base
 * rechace la fila entera. Se cachea por sesión para no consultar en cada
 * mensaje; `public_info` es de lectura pública, así que basta con mirar ahí.
 */
const esUsuarioCache = new Map<string, boolean>();

const esUsuarioDeWorky = async (contactId: string): Promise<boolean> => {
  const enCache = esUsuarioCache.get(contactId);
  if (enCache !== undefined) return enCache;

  // Un id que ni siquiera tiene forma de uuid no puede serlo.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contactId)) {
    esUsuarioCache.set(contactId, false);
    return false;
  }

  const { data } = await supabase
    .from('public_info')
    .select('user_id')
    .eq('user_id', contactId)
    .maybeSingle();

  const esUsuario = !!data;
  esUsuarioCache.set(contactId, esUsuario);
  return esUsuario;
};

export const sendMessage = async (
  contactId: string,
  message: Omit<Message, 'id'>
): Promise<string> => {
  const userId = getCurrentUserId();
  const chatId = getChatId(userId, contactId);
  const esUsuario = await esUsuarioDeWorky(contactId);

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: userId,
      // A un contacto sin cuenta no se le puede poner de destinatario, pero la
      // conversación se identifica por chat_id: se guarda igual y se anota a
      // quién iba. Ver supabase_mensajes_a_contactos_manuales.sql.
      //
      // La columna nueva solo se manda cuando hace falta: si se mandara
      // siempre, los envíos entre usuarios se romperían en cuanto alguien
      // usara una versión anterior a ese SQL.
      recipient_id: esUsuario ? contactId : null,
      ...(esUsuario ? {} : { recipient_contact: contactId }),
      text: message.text,
      type: message.type,
      metadata: message.metadata ?? null,
      timestamp: new Date().toISOString(),
      media_url: message.mediaUrl ?? null,
      media_type: message.mediaType ?? null,
      status: 'sent',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error enviando mensaje:', error);
    throw error;
  }

  // Lo que sigue es metadata de conversación entre usuarios: `user_chats`
  // guarda ids de usuario y el contador de no leídos es del otro lado. Con un
  // contacto sin cuenta no hay otro lado, y ambas llamadas fallarían por tipo.
  if (!esUsuario) return data.id;

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

/**
 * Actualiza el estado de un mensaje (sent, delivered, read)
 */
export const updateMessageStatus = async (
  messageId: string,
  status: 'sent' | 'delivered' | 'read'
): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .update({ status })
    .eq('id', messageId);

  if (error) {
    console.error('Error actualizando estado del mensaje:', error);
  }
};

/**
 * Marca como entregados los mensajes que me han mandado.
 *
 * El `neq` es lo que hace que el acuse signifique algo: la política RLS deja
 * que cualquiera de los dos participantes actualice cualquier mensaje del chat,
 * así que sin él esto marcaba también los míos salientes y el otro aparecía
 * como que los había recibido sin haber abierto nada.
 */
export const markMessagesAsDelivered = async (contactId: string): Promise<void> => {
  const userId = getCurrentUserId();
  const chatId = getChatId(userId, contactId);

  const { error } = await supabase
    .from('messages')
    .update({ status: 'delivered' })
    .eq('chat_id', chatId)
    .neq('sender_id', userId)
    .eq('status', 'sent');

  if (error) {
    console.error('Error marcando mensajes como entregados:', error);
  }
};

/**
 * Marca como leídos los mensajes que me han mandado.
 *
 * Mismo motivo que arriba para el `neq`: el doble visto es del otro, no mío.
 */
export const markMessagesAsRead = async (contactId: string): Promise<void> => {
  const userId = getCurrentUserId();
  const chatId = getChatId(userId, contactId);

  const { error } = await supabase
    .from('messages')
    .update({ status: 'read' })
    .eq('chat_id', chatId)
    .neq('sender_id', userId)
    .in('status', ['sent', 'delivered']);

  if (error) {
    console.error('Error marcando mensajes como leídos:', error);
  }
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
    // Descendente y luego se le da la vuelta. Ordenando ascendente, el límite
    // recorta por el otro extremo: una conversación de más de 100 mensajes se
    // abría por el principio, con los últimos —los que se vienen a leer— fuera.
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error cargando mensajes:', error);
      return;
    }
    if (cancelled) return;

    // El resto del código cuenta con el buffer en orden cronológico: es lo que
    // asume el `sort` al anexar por Realtime y lo que pinta la lista.
    buffer = (data || []).reverse().map((row) => rowToMessage(row, userId));
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

export const listenToGlobalIncomingMessages = (
  callback: (senderId: string, message: Message, rawPayload: any) => void
): (() => void) => {
  let userId: string | null = null;
  try {
    userId = getCurrentUserId();
  } catch {
    return () => {};
  }
  if (!userId) return () => {};

  const topicName = uniqueTopic(`global_incoming:${userId}`);
  const channel = supabase
    .channel(topicName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        const raw = payload.new;
        const senderId = raw.sender_id || raw.user_id;

        // Filtro Lógico: recipient_id coincide con el usuario autenticado y sender_id no es él mismo
        if (raw.recipient_id === userId && senderId && senderId !== userId) {
          const incomingMsg = rowToMessage(raw, userId);
          callback(senderId, incomingMsg, raw);
        }
      }
    )
    .subscribe();

  return () => {
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
  const { error, count } = await supabase
    .from('messages')
    .delete({ count: 'exact' })
    .eq('id', messageId);

  if (error) {
    console.error('Error al eliminar mensaje:', error);
    throw error;
  }

  if (count === 0) {
    throw new Error('No se pudo eliminar el mensaje en la base de datos (0 filas afectadas). Asegúrate de haber ejecutado el script SQL de permisos RLS (supabase_delete_messages_rls.sql).');
  }
};

// ============ CONTACTOS ============

// contact_user_id es el uid real del otro usuario y es lo único
// válido para abrir un chat. El id de la fila NO sirve para eso.
const rowToContact = (row: any): Contact => ({
  id: row.contact_user_id || row.id,
  clientName: row.client_name || row.alias || 'Contacto',
  alias: row.alias ?? undefined,
  avatar: row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.client_name || 'Contacto')}&background=random`,
  phone: row.phone || '',
  email: row.email ?? undefined,
  status: row.status || UserStatus.Lead,
  role: row.role || 'client',
  projects: [],
  lastMessage: row.last_message || '',
  lastMessageTime: row.last_message_time ? new Date(row.last_message_time) : new Date(),
  unreadCount: row.unread_count || 0,
  notes: row.notes ?? undefined,
});

export const addContact = async (contact: Contact): Promise<Contact> => {
  const userId = getCurrentUserId();
  const isManualLead = contact.id.startsWith('lead_');

  // 1. Intentar llamar a la función RPC (add_contact_mutual) — solo para usuarios registrados
  if (!isManualLead) {
    const { error: rpcError } = await supabase.rpc('add_contact_mutual', {
      p_other_user: contact.id,
      p_client_name: contact.clientName,
      p_avatar: contact.avatar ?? null,
      p_phone: contact.phone ?? null,
      p_status: contact.status,
      p_role: contact.role,
      p_alias: contact.alias ?? null,
    });

    if (!rpcError) return contact;

    console.warn('[addContact] RPC add_contact_mutual falló. Ejecutando fallback a inserción directa:', rpcError.message);
  }

  if (!userId) {
    throw new Error('Usuario no autenticado en la sesión actual.');
  }

  // 2. Fallback: Inserción directa en la tabla contacts
  //    Para leads manuales, contact_user_id es null (no existe en auth.users)
  const contactRow: any = {
    user_id: userId,
    contact_user_id: isManualLead ? null : contact.id,
    client_name: contact.clientName,
    alias: contact.alias || null,
    avatar: contact.avatar || null,
    phone: contact.phone || null,
    email: contact.email || null,
    status: contact.status,
    role: contact.role,
    last_message: '',
    last_message_time: new Date().toISOString(),
    unread_count: 0,
  };

  let res = await supabase
    .from('contacts')
    .insert(contactRow)
    .select();

  let insertError = res.error;
  let insertedData = res.data;

  // Si falla porque 'alias' o 'email' no se han creado todavía en la tabla
  // contacts de Supabase (ver supabase_contacts_email.sql). Se reintenta sin
  // ellas para no perder el contacto por una columna que falta.
  if (insertError && (insertError.message.includes('alias') || insertError.message.includes('email') || insertError.code === '42703')) {
    delete contactRow.alias;
    delete contactRow.email;
    const fallbackRes = await supabase
      .from('contacts')
      .insert(contactRow)
      .select();
    insertError = fallbackRes.error;
    insertedData = fallbackRes.data;
  }

  if (insertError) {
    console.error('Error insertando contacto en la tabla contacts:', insertError);
    throw insertError;
  }

  // 3. Registrar en user_chats (solo para usuarios registrados)
  if (!isManualLead) {
    await supabase
      .from('user_chats')
      .upsert({
        user_id: userId,
        contact_id: contact.id,
        last_message: '',
        last_message_time: new Date().toISOString(),
        unread: 0
      }, { onConflict: 'user_id,contact_id' });
  }

  if (insertedData && insertedData.length > 0) {
    return rowToContact(insertedData[0]);
  }

  return contact;
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
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(contactId);

  const filterQuery = isUuid
    ? `contact_user_id.eq.${contactId},id.eq.${contactId}`
    : `id.eq.${contactId}`;

  const { error: contactError } = await supabase
    .from('contacts')
    .delete()
    .eq('user_id', userId)
    .or(filterQuery);

  if (contactError) {
    console.error('Error al eliminar contacto de Supabase:', contactError);
    throw new Error(`Error en Supabase al eliminar contacto: ${contactError.message}`);
  }

  await supabase
    .from('user_chats')
    .delete()
    .eq('user_id', userId)
    .eq('contact_id', contactId);

  if (isUuid) {
    await supabase
      .from('messages')
      .delete()
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${contactId}),and(sender_id.eq.${contactId},recipient_id.eq.${userId})`);
  }
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
  //
  // `phone_or_email` solo se manda si trae algo. Es la columna por la que te
  // buscan, y quien entró con un alias no tiene correo ni teléfono: mandarla
  // vacía le borraba el alias que acababa de reservar y lo dejaba imposible de
  // encontrar. Omitirla conserva lo que ya hubiera.
  const publico: Record<string, unknown> = {
    user_id: userId,
    display_name: profile.businessName || profile.ownerName,
    avatar_url: profile.businessLogo || profile.profilePhoto,
  };
  // Si la fila aún no existe esto es un INSERT, y la columna es NOT NULL: hay
  // que mandar algo. Para quien entró solo con alias, ese alias es lo único que
  // tiene, y además es por lo que le buscarán. Se lee de la sesión porque el
  // perfil no lo lleva.
  let contacto = (profile.email || profile.phone || '').toLowerCase();
  if (!contacto) {
    const { data } = await supabase.auth.getUser();
    contacto = ((data?.user?.user_metadata?.alias as string) || '').toLowerCase();
  }
  if (contacto) publico.phone_or_email = contacto;

  const { error: publicError } = await supabase.from('public_info').upsert(publico, { onConflict: 'user_id' });
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

/**
 * Datos públicos de un usuario a partir de su id.
 *
 * No necesita sesión —`public_info` es de lectura pública— porque quien la
 * consulta es alguien que acaba de escanear un QR y todavía no tiene cuenta:
 * hace falta para decirle a quién pertenece el catálogo que está mirando.
 */
export const getPublicInfoById = async (
  userId: string
): Promise<{ userId: string; name: string; avatar?: string } | null> => {
  if (!userId?.trim()) return null;

  const { data, error } = await supabase
    .from('public_info')
    .select('user_id, display_name, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.warn('No se pudo leer public_info:', error.message);
    return null;
  }

  return {
    userId: data.user_id,
    name: data.display_name || 'Usuario',
    avatar: data.avatar_url || undefined,
  };
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
