import { database } from './firebaseConfig';
import { ref, push, set, onValue, off, update, query, orderByChild, limitToLast, remove, get, equalTo, increment as fbIncrement } from 'firebase/database';
import { Message, Contact } from '../types';
import { auth } from './firebaseConfig';

// Usuario actual - usa Firebase Auth UID si está disponible
let currentUserId: string | null = null;

// Inicializar userId desde Firebase Auth
export const initializeUserId = async () => {
  try {
    // Intentar obtener el usuario de Firebase Auth
    if (auth && auth.currentUser) {
      currentUserId = auth.currentUser.uid;
      // Registrar usuario en el índice para búsqueda
      await registerUserInIndex(auth.currentUser.uid, auth.currentUser.phoneNumber || auth.currentUser.email || '');
      return currentUserId;
    }
    
    // Fallback: usar localStorage si no hay auth
    currentUserId = localStorage.getItem('userId');
    if (!currentUserId) {
      currentUserId = 'user_' + Date.now();
      localStorage.setItem('userId', currentUserId);
    }
    return currentUserId;
  } catch (error) {
    console.error('Error inicializando userId:', error);
    // Fallback a localStorage
    currentUserId = localStorage.getItem('userId') || 'user_' + Date.now();
    localStorage.setItem('userId', currentUserId);
    return currentUserId;
  }
};

// Registrar usuario en índice para búsqueda
const registerUserInIndex = async (userId: string, phoneOrEmail: string) => {
  try {
    if (!phoneOrEmail) return;
    
    // Normalizar teléfono/email (quitar espacios, convertir a minúsculas)
    const normalized = phoneOrEmail.replace(/\s+/g, '').toLowerCase();
    
    // Sanitize: RTDB keys can't contain ".", "#", "$", "[", "]"
    const safeKey = normalized.replace(/\./g, ',').replace(/[#$\[\]]/g, '_');
    
    // Guardar en índice: userIndex/safeKey -> userId
    const indexRef = ref(database, `userIndex/${safeKey}`);
    await set(indexRef, userId);
    
    // Guardar también en users/{userId}/publicInfo para búsqueda inversa
    const publicInfoRef = ref(database, `users/${userId}/publicInfo`);
    await set(publicInfoRef, {
      phoneOrEmail: normalized,
      registeredAt: Date.now()
    });
  } catch (error) {
    console.error('Error registrando usuario en índice:', error);
  }
};

export const getCurrentUserId = () => {
  if (!currentUserId) {
    // Intentar obtener de auth primero
    if (auth && auth.currentUser) {
      currentUserId = auth.currentUser.uid;
    } else {
      currentUserId = localStorage.getItem('userId') || 'user_' + Date.now();
      localStorage.setItem('userId', currentUserId);
    }
  }
  return currentUserId;
};

// Actualizar userId cuando el usuario inicia sesión
export const setCurrentUserId = (userId: string, phoneOrEmail?: string) => {
  currentUserId = userId;
  localStorage.setItem('userId', userId);
  if (phoneOrEmail) {
    registerUserInIndex(userId, phoneOrEmail);
  }
};

// ============ MENSAJES ============

export const sendMessage = async (
  contactId: string,
  message: Omit<Message, 'id'>
): Promise<string> => {
  try {
    const chatId = getChatId(currentUserId!, contactId);
    console.log('[Chat] Enviando mensaje → chatId:', chatId, '| myUid:', currentUserId, '| contactId:', contactId);
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);
    
    await set(newMessageRef, {
      ...message,
      id: newMessageRef.key,
      timestamp: Date.now(),
      // Convertir Date a timestamp para metadata si existe
      metadata: message.metadata || undefined
    });

    // Actualizar último mensaje en la lista de chats
    const chatInfoRef = ref(database, `userChats/${currentUserId}/${contactId}`);
    await update(chatInfoRef, {
      lastMessage: message.text,
      lastMessageTime: Date.now(),
      unread: 0
    });

    const contactChatInfoRef = ref(database, `userChats/${contactId}/${currentUserId}`);
    await update(contactChatInfoRef, {
      lastMessage: message.text,
      lastMessageTime: Date.now(),
      unread: fbIncrement(1)
    });

    return newMessageRef.key!;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const listenToMessages = (
  contactId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const chatId = getChatId(currentUserId!, contactId);
  console.log('[Chat] Escuchando en sala:', chatId, '| myUid:', currentUserId, '| contactId:', contactId);
  const messagesRef = ref(database, `chats/${chatId}/messages`);
  const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));

  const unsubscribe = onValue(messagesQuery, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((childSnapshot) => {
      const msg = childSnapshot.val();
      // Convertir timestamp a Date
      if (msg.timestamp) {
        msg.timestamp = new Date(msg.timestamp);
      }
      messages.push(msg);
    });
    // Ordenar por timestamp
    messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    callback(messages);
  });

  return () => off(messagesRef);
};

// ============ CONTACTOS ============

export const addContact = async (contact: Contact): Promise<void> => {
  try {
    const contactRef = ref(database, `users/${currentUserId}/contacts/${contact.id}`);
    await set(contactRef, contact);

    // Inicializar chat info
    const chatInfoRef = ref(database, `userChats/${currentUserId}/${contact.id}`);
    await set(chatInfoRef, {
      contactId: contact.id,
      lastMessage: '',
      lastMessageTime: Date.now(),
      unread: 0
    });
  } catch (error) {
    console.error('Error adding contact:', error);
    throw error;
  }
};

export const listenToContacts = (
  callback: (contacts: Contact[]) => void
): (() => void) => {
  const contactsRef = ref(database, `users/${currentUserId}/contacts`);

  const unsubscribe = onValue(contactsRef, (snapshot) => {
    const contacts: Contact[] = [];
    snapshot.forEach((childSnapshot) => {
      const contact = childSnapshot.val();
      // Convertir timestamps de Firebase a Date objects
      if (contact.lastMessageTime) {
        contact.lastMessageTime = new Date(contact.lastMessageTime);
      }
      if (contact.projects) {
        contact.projects = contact.projects.map((proj: any) => ({
          ...proj,
          startDate: proj.startDate ? new Date(proj.startDate) : new Date(),
          expenses: (proj.expenses || []).map((exp: any) => ({
            ...exp,
            date: exp.date ? new Date(exp.date) : new Date()
          }))
        }));
      }
      contacts.push(contact);
    });
    callback(contacts);
  });

  return () => off(contactsRef);
};

export const updateContactStatus = async (
  contactId: string,
  status: 'online' | 'offline' | 'away'
): Promise<void> => {
  try {
    const statusRef = ref(database, `users/${contactId}/status`);
    await set(statusRef, {
      status,
      lastSeen: Date.now()
    });
  } catch (error) {
    console.error('Error updating status:', error);
    throw error;
  }
};

export const deleteContact = async (contactId: string): Promise<void> => {
  try {
    const userId = getCurrentUserId();
    
    // Eliminar contacto
    const contactRef = ref(database, `users/${userId}/contacts/${contactId}`);
    await remove(contactRef);
    
    // Eliminar información del chat
    const chatInfoRef = ref(database, `userChats/${userId}/${contactId}`);
    await remove(chatInfoRef);
    
    // Nota: No eliminamos los mensajes del chat porque podrían ser útiles en el futuro
    // Si se desea eliminar también los mensajes, se puede agregar aquí
  } catch (error) {
    console.error('Error deleting contact:', error);
    throw error;
  }
};

// ============ UTILIDADES ============

// Genera un ID determinista para el chat entre dos usuarios
// MUST always produce the same result regardless of argument order
export function getChatId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

// Helper increment eliminado — ahora se usa fbIncrement importado de firebase/database

// ============ PERFIL DE USUARIO ============

export const saveUserProfile = async (profile: any): Promise<void> => {
  try {
    const profileRef = ref(database, `users/${currentUserId}/profile`);
    await set(profileRef, profile);
  } catch (error) {
    console.error('Error saving profile:', error);
    throw error;
  }
};

export const getUserProfile = (callback: (profile: any) => void): (() => void) => {
  const profileRef = ref(database, `users/${currentUserId}/profile`);
  
  const unsubscribe = onValue(profileRef, (snapshot) => {
    callback(snapshot.val());
  });

  return () => off(profileRef);
};

// ============ BÚSQUEDA DE USUARIOS ============

/**
 * Buscar usuario por teléfono o email
 * @param phoneOrEmail - Teléfono o email del usuario a buscar
 * @returns Información del usuario encontrado o null
 */
export const searchUserByPhoneOrEmail = async (phoneOrEmail: string): Promise<{
  userId: string;
  name?: string;
  avatar?: string;
  phone?: string;
} | null> => {
  try {
    if (!phoneOrEmail) return null;
    
    // Normalizar búsqueda
    const normalized = phoneOrEmail.replace(/\s+/g, '').toLowerCase();
    
    // Buscar en el índice
    // Sanitize key for RTDB
    const safeKey = normalized.replace(/\./g, ',').replace(/[#$\[\]]/g, '_');
    const indexRef = ref(database, `userIndex/${safeKey}`);
    const snapshot = await get(indexRef);
    
    if (!snapshot.exists()) {
      return null; // Usuario no encontrado
    }
    
    const userId = snapshot.val();
    
    // Obtener información pública del usuario
    const publicInfoRef = ref(database, `users/${userId}/publicInfo`);
    const profileRef = ref(database, `users/${userId}/profile`);
    
    const [publicInfoSnap, profileSnap] = await Promise.all([
      get(publicInfoRef),
      get(profileRef)
    ]);
    
    const publicInfo = publicInfoSnap.val() || {};
    const profile = profileSnap.val() || {};
    
    // No devolver si es el mismo usuario
    if (userId === getCurrentUserId()) {
      return null;
    }
    
    return {
      userId,
      name: profile.businessName || profile.name || 'Usuario',
      avatar: profile.businessLogo || profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.businessName || profile.name || 'Usuario')}&background=random`,
      phone: publicInfo.phoneOrEmail || phoneOrEmail
    };
  } catch (error) {
    console.error('Error buscando usuario:', error);
    return null;
  }
};

/**
 * Agregar contacto desde búsqueda (cuando se encuentra un usuario)
 */
export const addContactFromSearch = async (
  foundUser: { userId: string; name?: string; avatar?: string; phone?: string }
): Promise<Contact> => {
  try {
    const userId = getCurrentUserId();
    
    // Verificar si ya es contacto
    const existingContactRef = ref(database, `users/${userId}/contacts/${foundUser.userId}`);
    const existingSnap = await get(existingContactRef);
    
    if (existingSnap.exists()) {
      throw new Error('Este usuario ya está en tus contactos');
    }
    
    // Crear contacto
    const newContact: Contact = {
      id: foundUser.userId,
      clientName: foundUser.name || 'Usuario',
      avatar: foundUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name || 'Usuario')}&background=random`,
      phone: foundUser.phone || '',
      status: 'lead' as any,
      role: 'client',
      projects: [],
      lastMessage: 'Nuevo contacto',
      lastMessageTime: new Date(),
      unreadCount: 0
    };
    
    // Guardar contacto
    await addContact(newContact);
    
    // También crear el chat info para el otro usuario
    const otherUserChatRef = ref(database, `userChats/${foundUser.userId}/${userId}`);
    await set(otherUserChatRef, {
      contactId: userId,
      lastMessage: '',
      lastMessageTime: Date.now(),
      unread: 0
    });
    
    return newContact;
  } catch (error) {
    console.error('Error agregando contacto desde búsqueda:', error);
    throw error;
  }
};
