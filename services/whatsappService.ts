import { supabase } from './supabaseConfig';

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
export const saveSharedDocument = async (documentId: string, documentData: any): Promise<void> => {
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
      .from('files')
      .upload(`shared_docs/${documentId}.json`, jsonBlob, {
        contentType: 'application/json',
        upsert: true
      });
  } catch (e) {
    console.warn('Error subiendo JSON a Supabase storage:', e);
  }

  // 3. Subir HTML renderizado para visualización directa en navegador/móvil
  try {
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documento ${documentId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    .document { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px; }
    .item { padding: 10px; margin: 5px 0; background: white; border-left: 4px solid #3498db; }
    .total { font-size: 1.5em; font-weight: bold; color: #27ae60; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${docWithMeta.type === 'quote' ? 'Cotización' : docWithMeta.type}</h1>
    <div class="document">
      <pre>${JSON.stringify(docWithMeta, null, 2)}</pre>
    </div>
    <p style="text-align: center; margin-top: 40px; color: #7f8c8d; font-size: 0.9em;">
      Documento compartido - ${new Date().toLocaleString('es-ES')}
    </p>
  </div>
</body>
</html>`;

    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    await supabase.storage
      .from('files')
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
    const { data } = supabase.storage.from('files').getPublicUrl(`shared_docs/${documentId}.json`);
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
  const { data } = supabase.storage.from('files').getPublicUrl(`shared_docs/${documentId}.html`);
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
}, documentLink?: string): string => {
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

  return `📋 *Cotización #${quoteData.quoteNumber}*

Hola ${quoteData.clientName},

Te envío la cotización solicitada:

${itemsText}

*Total: $${quoteData.total.toLocaleString()}*${linkText}
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
}, documentLink?: string): string => {
  const dueDateText = invoiceData.dueDate 
    ? `\n*Fecha de vencimiento:* ${invoiceData.dueDate.toLocaleDateString()}`
    : '';
  
  const linkText = documentLink ? `\n\n📄 *Ver documento completo:*\n${documentLink}\n` : '';
  
  return `🧾 *Factura #${invoiceData.invoiceNumber}*

Hola ${invoiceData.clientName},

Te envío la factura correspondiente:

*Total: $${invoiceData.total.toLocaleString()}*${dueDateText}${linkText}
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
  documentLink?: string
): void => {
  const message = generateQuoteMessage(quoteData, documentLink);
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
  documentLink?: string
): void => {
  const message = generateInvoiceMessage(invoiceData, documentLink);
  const fullMessage = invoiceData.pdfUrl
    ? `${message}\n\n📄 Ver PDF completo: ${invoiceData.pdfUrl}`
    : message;
  
  openWhatsApp(phone, fullMessage);
};











