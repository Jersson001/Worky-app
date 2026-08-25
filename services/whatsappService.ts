import { supabase, PUBLIC_BUCKET } from './supabaseConfig';
import { qrImageUrl } from './catalogShareService';
import { buildDocumentHtml } from './documentHtml';

/**
 * Pie del documento con el enlace y el QR del catálogo.
 * Quien lo escanee entra sin registrarse; solo hace falta cuenta para chatear.
 */
const bloqueCatalogo = ({ url, negocio }: { url: string; negocio: string }): string => `
      <div style="margin-top:28px;padding:22px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;text-align:center">
        <p style="font-size:1rem;font-weight:700;color:#1e293b;margin:0 0 4px">Conoce todo nuestro catálogo</p>
        <p style="color:#64748b;font-size:.84rem;margin:0 0 14px">Escanea el código o abre el enlace — no necesitas registrarte.</p>
        <img src="${qrImageUrl(url, 200)}" alt="QR del catálogo de ${negocio}" width="150" height="150" style="display:block;margin:0 auto 10px;background:#fff;padding:8px;border-radius:8px">
        <a href="${url}" style="color:#2563eb;font-size:.8rem;word-break:break-all">${url}</a>
      </div>`;

/**
 * Formatea un número de teléfono para WhatsApp
 * Elimina caracteres especiales y deja solo números
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Genera un enlace de WhatsApp para enviar un mensaje de texto
 * @param phone Número de teléfono (con o sin formato)
 * @param message Mensaje a enviar
 * @returns URL de WhatsApp
 */
export const generateWhatsAppLink = (phone: string, message: string): string => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
};

/**
 * Abre WhatsApp con un mensaje prellenado
 * @param phone Número de teléfono
 * @param message Mensaje a enviar
 */
export const openWhatsApp = (phone: string, message: string): void => {
  const url = generateWhatsAppLink(phone, message);
  window.open(url, '_blank');
};

/**
 * Genera un ID único para un documento
 */
export const generateDocumentId = (): string => {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
};

export const WORKY_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.worky.app.v2';

/**
 * Guarda un documento en localStorage y en Supabase Storage (como JSON + HTML)
 */
export const saveSharedDocument = async (
  documentId: string,
  documentData: any,
  /** Si se pasa, el documento lleva al pie el enlace y el QR del catálogo. */
  catalogo?: { url: string; negocio: string },
): Promise<void> => {
  const docWithMeta = {
    ...documentData,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Expira en 30 días
  };

  // 1. Guardar localmente
  try {
    const sharedDocs = JSON.parse(localStorage.getItem('sharedDocuments') || '{}');
    sharedDocs[documentId] = docWithMeta;
    localStorage.setItem('sharedDocuments', JSON.stringify(sharedDocs));
  } catch (e) {
    console.error('Error guardando en localStorage:', e);
  }

  // 2. Subir JSON a Supabase Storage
  try {
    const jsonBlob = new Blob([JSON.stringify(docWithMeta)], { type: 'application/json' });
    await supabase.storage
      .from(PUBLIC_BUCKET)
      .upload(`shared_docs/${documentId}.json`, jsonBlob, {
        contentType: 'application/json',
        upsert: true
      });
  } catch (e) {
    console.warn('Error subiendo JSON a Supabase storage:', e);
  }

  // 3. Subir HTML renderizado para visualización directa en navegador/móvil
  try {
    const htmlContent = buildDocumentHtml(docWithMeta, catalogo ? bloqueCatalogo(catalogo) : '');

    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    await supabase.storage
      .from(PUBLIC_BUCKET)
      .upload(`shared_docs/${documentId}.html`, htmlBlob, {
        contentType: 'text/html',
        upsert: true
      });
  } catch (e) {
    console.warn('Error subiendo HTML a Supabase storage:', e);
  }
};

/**
 * Obtiene un documento compartido por su ID
 */
export const getSharedDocument = async (documentId: string): Promise<any | null> => {
  try {
    // 1. Primero intentar desde localStorage
    const sharedDocs = JSON.parse(localStorage.getItem('sharedDocuments') || '{}');
    if (sharedDocs[documentId]) {
      return sharedDocs[documentId];
    }

    // 2. Si no está en local (ej: cliente en su propio teléfono), obtener de Supabase Storage
    const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(`shared_docs/${documentId}.json`);
    if (data?.publicUrl) {
      const res = await fetch(data.publicUrl);
      if (res.ok) {
        const doc = await res.json();
        return doc;
      }
    }

    return null;
  } catch (e) {
    console.error('Error obteniendo documento compartido:', e);
    return null;
  }
};

/**
 * Genera el link público de Supabase Storage para ver un documento compartido
 * Retorna el link al archivo HTML renderizado (no JSON)
 * Este link funciona en iOS, Android y cualquier dispositivo sin depender del dominio
 */
export const generateDocumentViewLink = (documentId: string): string => {
  // Link directo al HTML en Supabase Storage - accesible desde cualquier navegador/dispositivo
  const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(`shared_docs/${documentId}.html`);
  return data?.publicUrl || `${window.location.origin}/?view=${documentId}`;
};

/**
 * Genera un mensaje para compartir una cotización
 */
export const generateQuoteMessage = (quoteData: {
  quoteNumber: string;
  clientName: string;
  total: number;
  items: Array<{ description: string; quantity: number; price: number }>;
  sections?: Array<{
    name: string;
    groups: Array<{
      label: string;
      items: Array<{ description: string; quantity: number; unitCost: number; unit: string; measure?: number }>;
    }>;
  }>;
}, documentLink?: string, catalogLink?: string): string => {
  let itemsText: string;

  if (quoteData.sections && quoteData.sections.length > 0) {
    itemsText = quoteData.sections
      .map(section => {
        const groupsText = section.groups
          .filter(g => g.items.some(i => i.description))
          .map(group => {
            const groupItemsText = group.items
              .filter(i => i.description)
              .map(item => {
                const measureText = (item.unit === 'ML' || item.unit === 'M2') && item.measure ? ` × ${item.measure}${item.unit}` : '';
                return `  • ${item.description} x${item.quantity}${measureText}`;
              })
              .join('\n');
            return `_${group.label}_\n${groupItemsText}`;
          })
          .join('\n\n');
        return `*${section.name.toUpperCase()}*\n${groupsText}`;
      })
      .join('\n\n');
  } else {
    itemsText = quoteData.items
      .map(item => `• ${item.description} x${item.quantity} - $${item.price.toLocaleString()}`)
      .join('\n');
  }

  const linkText = documentLink ? `\n\n📄 *Ver documento completo:*\n${documentLink}\n` : '';
  const catalogText = catalogLink ? `\n🛒 *Mira nuestro catálogo:*\n${catalogLink}\n` : '';

  return `📋 *Cotización #${quoteData.quoteNumber}*

Hola ${quoteData.clientName},

Te envío la cotización solicitada:

${itemsText}

*Total: $${quoteData.total.toLocaleString()}*${linkText}${catalogText}
¿Te parece bien? Puedo ajustar cualquier detalle.

Saludos!

📲 *Descarga Worky App en Google Play:*
${WORKY_PLAY_STORE_URL}`;
};

/**
 * Genera un mensaje para compartir una factura
 */
export const generateInvoiceMessage = (invoiceData: {
  invoiceNumber: string;
  clientName: string;
  total: number;
  dueDate?: Date;
}, documentLink?: string, catalogLink?: string): string => {
  const dueDateText = invoiceData.dueDate 
    ? `\n*Fecha de vencimiento:* ${invoiceData.dueDate.toLocaleDateString()}`
    : '';
  
  const linkText = documentLink ? `\n\n📄 *Ver documento completo:*\n${documentLink}\n` : '';
  const catalogText = catalogLink ? `\n🛒 *Mira nuestro catálogo:*\n${catalogLink}\n` : '';

  return `🧾 *Factura #${invoiceData.invoiceNumber}*

Hola ${invoiceData.clientName},

Te envío la factura correspondiente:

*Total: $${invoiceData.total.toLocaleString()}*${dueDateText}${linkText}${catalogText}
Por favor, realiza el pago a la brevedad posible.

¡Gracias por tu preferencia!

📲 *Descarga Worky App en Google Play:*
${WORKY_PLAY_STORE_URL}`;
};

/**
 * Genera un mensaje para compartir un producto
 */
export const generateProductMessage = (product: {
  name: string;
  price: number;
  description?: string;
  image?: string;
}): string => {
  const descriptionText = product.description ? `\n${product.description}\n` : '';
  
  return `🛍️ *${product.name}*

${descriptionText}*Precio: $${product.price.toLocaleString()}*

¿Te interesa? Puedo darte más información.

📲 *Descarga Worky App:*
${WORKY_PLAY_STORE_URL}`;
};

/**
 * Comparte un archivo/documento a través de WhatsApp
 */
export const shareFileViaWhatsApp = (
  phone: string,
  fileName: string,
  fileUrl: string,
  message?: string
): void => {
  const defaultMessage = `📎 Te comparto el archivo: ${fileName}`;
  const fullMessage = message 
    ? `${message}\n\n📎 Archivo: ${fileName}\n🔗 ${fileUrl}\n\n📲 *Descarga Worky App:*\n${WORKY_PLAY_STORE_URL}`
    : `${defaultMessage}\n\n🔗 ${fileUrl}\n\n📲 *Descarga Worky App:*\n${WORKY_PLAY_STORE_URL}`;
  
  openWhatsApp(phone, fullMessage);
};

/**
 * Comparte una cotización completa con detalles
 */
export const shareQuoteViaWhatsApp = (
  phone: string,
  quoteData: {
    quoteNumber: string;
    clientName: string;
    total: number;
    items: Array<{ description: string; quantity: number; price: number }>;
    sections?: Array<{
      name: string;
      groups: Array<{
        label: string;
        items: Array<{ description: string; quantity: number; unitCost: number; unit: string; measure?: number }>;
      }>;
    }>;
    pdfUrl?: string;
  },
  documentLink?: string,
  catalogLink?: string
): void => {
  const message = generateQuoteMessage(quoteData, documentLink, catalogLink);
  const fullMessage = quoteData.pdfUrl
    ? `${message}\n\n📄 Ver PDF completo: ${quoteData.pdfUrl}`
    : message;
  
  openWhatsApp(phone, fullMessage);
};

/**
 * Comparte una factura con detalles
 */
export const shareInvoiceViaWhatsApp = (
  phone: string,
  invoiceData: {
    invoiceNumber: string;
    clientName: string;
    total: number;
    dueDate?: Date;
    pdfUrl?: string;
  },
  documentLink?: string,
  catalogLink?: string
): void => {
  const message = generateInvoiceMessage(invoiceData, documentLink, catalogLink);
  const fullMessage = invoiceData.pdfUrl
    ? `${message}\n\n📄 Ver PDF completo: ${invoiceData.pdfUrl}`
    : message;
  
  openWhatsApp(phone, fullMessage);
};











