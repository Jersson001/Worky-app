import { supabase, PUBLIC_BUCKET } from './supabaseConfig';
import { getCurrentUserId } from './messagingService';
import { qrImageUrl, WORKY_APP_URL, chatInviteUrl } from './catalogShareService';
import { buildDocumentHtml } from './documentHtml';
import { formatCurrency } from '../utils/currency';
import { describeCantidad, seccionesConContenido } from '../utils/carpentryCalculations';
import { CarpentrySection } from '../types';

/**
 * El pie del documento: responder, ver el catálogo, y quién lo hizo.
 *
 * Antes era el enlace del catálogo escrito en letra pequeña bajo un QR. En un
 * celular hay que apuntarle a ese texto para tocarlo, y sobre todo: no había
 * forma de contestar. Alguien recibía una cotización, la leía y se quedaba sin
 * saber cómo responder —pasó con una clienta de verdad—, así que lo primero es
 * el botón de responder.
 *
 * `vendedorId` es quien manda el documento y `documentId` el documento mismo:
 * los dos viajan en el enlace para que, al entrar, la conversación se abra con
 * la cotización ya dentro en vez de en blanco.
 */
const boton = (href: string, texto: string, principal = false): string => `
        <a href="${href}" style="display:block;text-decoration:none;font-weight:700;padding:15px 20px;
           border-radius:12px;font-size:1rem;text-align:center;${principal
             ? 'background:#2563eb;color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.28)'
             : 'background:#fff;color:#334155;border:1px solid #e2e8f0'}">${texto}</a>`;

const bloqueCatalogo = (
  { url, negocio }: { url: string; negocio: string },
  vendedorId?: string,
  documentId?: string,
): string => {
  const responder = vendedorId ? chatInviteUrl(vendedorId, documentId) : '';

  return `
      ${responder ? `
      <div style="margin-top:28px;padding:22px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;text-align:center">
        <p style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 4px">¿Tienes dudas o quieres aceptar?</p>
        <p style="color:#475569;font-size:.86rem;margin:0 0 16px">Respóndenos por el chat. No necesitas registrarte.</p>
        ${boton(responder, 'Responder por el chat', true)}
      </div>` : ''}

      ${!url ? '' : `
      <div style="margin-top:${responder ? '12' : '28'}px;padding:22px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;text-align:center">
        <p style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 4px">Conoce todo nuestro catálogo</p>
        <p style="color:#64748b;font-size:.86rem;margin:0 0 16px">Mira todo lo que hacemos. No necesitas registrarte.</p>
        ${boton(url, 'Ver catálogo')}
        <div style="display:flex;align-items:center;gap:10px;margin:16px 0 12px">
          <span style="flex:1;height:1px;background:#e2e8f0"></span>
          <span style="color:#94a3b8;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em">o escanea</span>
          <span style="flex:1;height:1px;background:#e2e8f0"></span>
        </div>
        <img src="${qrImageUrl(url, 200)}" alt="QR del catálogo de ${negocio}" width="110" height="110" style="display:block;margin:0 auto;background:#fff;padding:7px;border-radius:10px;border:1px solid #e2e8f0">
      </div>`}

      <div style="margin-top:12px;padding:14px 18px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;display:flex;align-items:center;gap:12px">
        <div style="flex:1;text-align:left">
          <p style="font-size:.8rem;font-weight:700;color:#334155;margin:0">Cotización hecha con Worky</p>
          <p style="color:#94a3b8;font-size:.72rem;margin:2px 0 0">Cotiza y cobra desde el celular</p>
        </div>
        <a href="${WORKY_PLAY_STORE_URL}" style="background:#f1f5f9;color:#334155;text-decoration:none;font-weight:700;font-size:.78rem;padding:9px 14px;border-radius:9px;border:1px solid #e2e8f0;white-space:nowrap">Descargar</a>
      </div>`;
};

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
/**
 * Abre WhatsApp con el mensaje ya escrito.
 *
 * `ventana` es una pestaña abierta *antes* de las esperas: compartir un
 * documento publica el catálogo y lo sube, y para cuando termina el navegador
 * ya no considera que haya un clic detrás, así que el bloqueador de emergentes
 * se comía el `window.open` sin decir nada —el botón parecía muerto—. Quien
 * comparte abre la pestaña en el clic y aquí solo se le pone la dirección.
 */
/** Escapa lo que entra en el HTML de la pestaña puente. */
const escHtml = (v: string): string =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Página de paso para la pestaña que se abrió al pulsar.
 *
 * No basta con asignarle la dirección: la pestaña se queda en `about:blank` a
 * la vista y hay que recargarla para que vaya a WhatsApp. Así que se le escribe
 * una página que redirige sola y que, si no lo consigue, deja el enlace a mano.
 * Lleva vuelta a Worky porque desde WhatsApp no había forma de regresar.
 */
const paginaPuente = (url: string): string => `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="0;url=${escHtml(url)}">
<title>Abriendo WhatsApp…</title>
<style>
  body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#0f172a;
       display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}
  .caja{background:#fff;padding:28px;border-radius:16px;box-shadow:0 1px 4px rgba(15,23,42,.12);text-align:center;max-width:360px}
  p{color:#64748b;font-size:.9rem;margin:0 0 18px}
  a{display:block;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;font-size:.9rem}
  .wa{background:#22c55e;color:#fff;margin-bottom:10px}
  .volver{color:#2563eb}
</style></head>
<body><div class="caja">
  <p>Abriendo WhatsApp con tu documento…</p>
  <a class="wa" href="${escHtml(url)}">Abrir WhatsApp</a>
  <a class="volver" href="${escHtml(WORKY_APP_URL)}">Volver a Worky</a>
</div></body></html>`;

export const openWhatsApp = (phone: string, message: string, ventana?: Window | null): void => {
  const url = generateWhatsAppLink(phone, message);

  if (ventana && !ventana.closed) {
    ventana.document.write(paginaPuente(url));
    ventana.document.close();
    return;
  }

  // Sin pestaña previa: si el bloqueador también impide esto, se navega en la
  // misma, que es preferible a no hacer nada.
  const abierta = window.open(url, '_blank');
  if (!abierta) window.location.href = url;
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
  // Quien sube el documento es quien lo manda. Su id va DENTRO del documento,
  // no solo en el HTML de Storage: el enlace que se comparte es `?view=`, que
  // abre la aplicación y pinta el documento con React, así que el HTML de
  // Storage casi nadie lo ve. Sin este id, el visor no sabe a quién responder.
  let vendedorId: string | undefined;
  try {
    vendedorId = getCurrentUserId();
  } catch {
    // Sin sesión no se puede ofrecer el chat; el documento se comparte igual.
  }

  const docWithMeta = {
    ...documentData,
    vendedorId,
    documentId,
    // La dirección del catálogo se guarda, no se deduce del vendedor: solo la
    // hay si tiene productos publicados, y un botón que lleve a un catálogo
    // vacío es peor que no ponerlo.
    catalogoUrl: catalogo?.url,
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
    const htmlContent = buildDocumentHtml(
      docWithMeta,
      catalogo || vendedorId
        ? bloqueCatalogo(catalogo ?? { url: '', negocio: '' }, vendedorId, documentId)
        : '',
    );

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
 * Link para ver un documento compartido. Lo abre quien lo recibe, sin sesión:
 * `?view=` se resuelve antes del login.
 *
 * Apuntaba al HTML en Storage, pero Supabase sirve todo HTML público como
 * text/plain con nosniff, así que el destinatario veía el código fuente. La app
 * lee el JSON de Storage y lo pinta ella, igual que hace con el catálogo.
 */
export const generateDocumentViewLink = (documentId: string): string =>
  `${WORKY_APP_URL}/?view=${documentId}`;

/**
 * Genera un mensaje para compartir una cotización
 */
export const generateQuoteMessage = (quoteData: {
  quoteNumber: string;
  clientName: string;
  total: number;
  items: Array<{ description: string; quantity: number; price: number }>;
  // El tipo real y no una copia a mano: la copia declaraba `unit: string` y con
  // eso cualquier unidad inventada pasaba el compilador aquí dentro.
  sections?: CarpentrySection[];
}, documentLink?: string, catalogLink?: string): string => {
  let itemsText: string;

  // Mismo filtro que el documento: si aquí se filtrara aparte, el mensaje y el
  // documento dirían cosas distintas de la misma cotización.
  const seccionesVisibles = seccionesConContenido(quoteData.sections || []);

  if (seccionesVisibles.length > 0) {
    itemsText = seccionesVisibles
      .map(section => {
        const groupsText = section.groups
          .map(group => {
            const groupItemsText = group.items
              .map(item => {
                // En un mensaje de texto no cabe la foto, así que la línea sin
                // nombre se anuncia con su grupo: una viñeta vacía no dice nada.
                const que = item.description.trim() || group.label;
                // El comentario lleva las condiciones del trabajo, y en el
                // mensaje es lo único que las cuenta: aquí no hay fotos.
                const nota = item.comments?.trim();
                return `  • ${que} ${describeCantidad(item)}`
                  + (nota ? `\n    _${nota.replace(/\n+/g, ' ')}_` : '');
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
      .map(item => `• ${item.description} x${item.quantity} - ${formatCurrency(item.price)}`)
      .join('\n');
  }

  // Un solo enlace, el del documento.
  //
  // Llevaba tres —documento, catálogo y Google Play— compitiendo en el mismo
  // mensaje: quedaba largo, parecía publicidad y el que importa se perdía entre
  // los otros dos. El catálogo y la descarga viven ahora dentro del documento,
  // como botones, y se le ofrecen después de que haya visto el precio.
  const linkText = documentLink ? `\n\n📄 *Ver la cotización:*\n${documentLink}\n` : '';

  return `📋 *Cotización #${quoteData.quoteNumber}*

Hola ${quoteData.clientName},

Te envío la cotización solicitada:

${itemsText}

*Total: ${formatCurrency(quoteData.total)}*${linkText}
¿Te parece bien? Puedo ajustar cualquier detalle. Puedes responderme desde ahí mismo.

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
}, documentLink?: string, catalogLink?: string): string => {
  const dueDateText = invoiceData.dueDate 
    ? `\n*Fecha de vencimiento:* ${invoiceData.dueDate.toLocaleDateString()}`
    : '';
  
  const linkText = documentLink ? `\n\n📄 *Ver la factura:*\n${documentLink}\n` : '';

  return `🧾 *Factura #${invoiceData.invoiceNumber}*

Hola ${invoiceData.clientName},

Te envío la factura correspondiente:

*Total: ${formatCurrency(invoiceData.total)}*${dueDateText}${linkText}
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

${descriptionText}*Precio: ${formatCurrency(product.price)}*

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
  message?: string,
  ventana?: Window | null
): void => {
  const defaultMessage = `📎 Te comparto el archivo: ${fileName}`;
  const fullMessage = message 
    ? `${message}\n\n📎 Archivo: ${fileName}\n🔗 ${fileUrl}\n\n📲 *Descarga Worky App:*\n${WORKY_PLAY_STORE_URL}`
    : `${defaultMessage}\n\n🔗 ${fileUrl}\n\n📲 *Descarga Worky App:*\n${WORKY_PLAY_STORE_URL}`;
  
  openWhatsApp(phone, fullMessage, ventana);
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
    sections?: CarpentrySection[];
    pdfUrl?: string;
  },
  documentLink?: string,
  catalogLink?: string,
  ventana?: Window | null
): void => {
  const message = generateQuoteMessage(quoteData, documentLink, catalogLink);
  const fullMessage = quoteData.pdfUrl
    ? `${message}\n\n📄 Ver PDF completo: ${quoteData.pdfUrl}`
    : message;
  
  openWhatsApp(phone, fullMessage, ventana);
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
  catalogLink?: string,
  ventana?: Window | null
): void => {
  const message = generateInvoiceMessage(invoiceData, documentLink, catalogLink);
  const fullMessage = invoiceData.pdfUrl
    ? `${message}\n\n📄 Ver PDF completo: ${invoiceData.pdfUrl}`
    : message;
  
  openWhatsApp(phone, fullMessage, ventana);
};











