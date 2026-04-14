/**
 * Servicio para integración con WhatsApp
 * Permite compartir documentos, cotizaciones y mensajes a través de WhatsApp
 */

/**
 * Formatea un número de teléfono para WhatsApp
 * Elimina caracteres especiales y deja solo números
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
  // Eliminar espacios, guiones, paréntesis, etc.
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
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
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
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Guarda un documento en localStorage para poder compartirlo
 */
export const saveSharedDocument = (documentId: string, documentData: any): void => {
  const sharedDocs = JSON.parse(localStorage.getItem('sharedDocuments') || '{}');
  sharedDocs[documentId] = {
    ...documentData,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Expira en 7 días
  };
  localStorage.setItem('sharedDocuments', JSON.stringify(sharedDocs));
};

/**
 * Obtiene un documento compartido por su ID
 */
export const getSharedDocument = (documentId: string): any | null => {
  const sharedDocs = JSON.parse(localStorage.getItem('sharedDocuments') || '{}');
  return sharedDocs[documentId] || null;
};

/**
 * Genera el link para ver un documento compartido
 */
export const generateDocumentViewLink = (documentId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/?view=${documentId}`;
};

/**
 * Genera un mensaje para compartir una cotización
 */
export const generateQuoteMessage = (quoteData: {
  quoteNumber: string;
  clientName: string;
  total: number;
  items: Array<{ description: string; quantity: number; price: number }>;
}, documentLink?: string): string => {
  const itemsText = quoteData.items
    .map(item => `• ${item.description} x${item.quantity} - $${item.price.toLocaleString()}`)
    .join('\n');
  
  const linkText = documentLink ? `\n\n📎 *Ver documento completo:*\n${documentLink}\n` : '';
  
  return `📋 *Cotización #${quoteData.quoteNumber}*

Hola ${quoteData.clientName},

Te envío la cotización solicitada:

${itemsText}

*Total: $${quoteData.total.toLocaleString()}*${linkText}
¿Te parece bien? Puedo ajustar cualquier detalle.

Saludos!`;
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
  
  const linkText = documentLink ? `\n\n📎 *Ver documento completo:*\n${documentLink}\n` : '';
  
  return `🧾 *Factura #${invoiceData.invoiceNumber}*

Hola ${invoiceData.clientName},

Te envío la factura correspondiente:

*Total: $${invoiceData.total.toLocaleString()}*${dueDateText}${linkText}
Por favor, realiza el pago a la brevedad posible.

¡Gracias por tu preferencia!`;
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

¿Te interesa? Puedo darte más información.`;
};

/**
 * Comparte un archivo/documento a través de WhatsApp
 * Nota: WhatsApp Web no permite compartir archivos directamente desde el navegador
 * Esta función genera un mensaje con un enlace al archivo
 */
export const shareFileViaWhatsApp = (
  phone: string,
  fileName: string,
  fileUrl: string,
  message?: string
): void => {
  const defaultMessage = `📎 Te comparto el archivo: ${fileName}`;
  const fullMessage = message 
    ? `${message}\n\n📎 Archivo: ${fileName}\n🔗 ${fileUrl}`
    : `${defaultMessage}\n\n🔗 ${fileUrl}`;
  
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
    pdfUrl?: string;
  },
  documentLink?: string
): void => {
  const message = generateQuoteMessage(quoteData, documentLink);
  const downloadText = '\n\n📱 *Descarga Worky App:*\nhttps://worky.app/download';
  const fullMessage = quoteData.pdfUrl
    ? `${message}\n\n📄 Ver PDF completo: ${quoteData.pdfUrl}${downloadText}`
    : `${message}${downloadText}`;
  
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
  const downloadText = '\n\n📱 *Descarga Worky App:*\nhttps://worky.app/download';
  const fullMessage = invoiceData.pdfUrl
    ? `${message}\n\n📄 Ver PDF completo: ${invoiceData.pdfUrl}${downloadText}`
    : `${message}${downloadText}`;
  
  openWhatsApp(phone, fullMessage);
};











