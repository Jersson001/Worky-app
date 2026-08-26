/**
 * Documento compartible en HTML.
 *
 * Antes se subía `<pre>${JSON.stringify(doc)}</pre>`: el cliente que abría el
 * enlace de WhatsApp veía la estructura de datos en crudo. Esto lo maqueta
 * como un documento de verdad.
 *
 * Es HTML plano y autónomo, sin React ni dependencias: vive como archivo
 * suelto en Storage y lo abre cualquiera, sin sesión y sin la app.
 */
import { formatCurrency } from '../utils/currency';
import { computeLineSubtotal, esLineaUsada } from '../utils/carpentryCalculations';

type DocType = 'quote' | 'invoice' | 'receipt' | 'collection_account' | 'expense_receipt';

const TITULOS: Record<DocType, string> = {
  quote: 'Cotización',
  invoice: 'Factura',
  receipt: 'Recibo de Caja',
  collection_account: 'Cuenta de Cobro',
  expense_receipt: 'Comprobante de Gasto',
};

/** El texto lo escribe el usuario: se escapa antes de entrar al HTML. */
const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Las fechas llegan como Date o como string ISO, según de dónde venga el doc. */
const fecha = (v: unknown): string => {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(String(v));
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
};

const fila = (etiqueta: string, valor: string): string =>
  valor ? `<div class="dato"><span>${esc(etiqueta)}</span><strong>${esc(valor)}</strong></div>` : '';

const tablaItems = (items: Array<{ description: string; quantity: number; price: number }>): string => `
  <table>
    <thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead>
    <tbody>
      ${items.filter(i => i?.description).map(i => `
      <tr>
        <td>${esc(i.description)}</td>
        <td class="num">${i.quantity}</td>
        <td class="num">${formatCurrency(i.price || 0)}</td>
        <td class="num">${formatCurrency((i.price || 0) * (i.quantity || 0))}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;

/**
 * Fotos de un ítem. Hasta tres: viajan como data URL dentro del propio HTML,
 * así que cada una pesa lo suyo y el documento se manda por WhatsApp.
 */
const fotos = (imagenes?: string[]): string =>
  imagenes?.length
    ? `<div class="fotos">${imagenes.slice(0, 3)
        .map(src => `<img src="${esc(src)}" alt="">`)
        .join('')}</div>`
    : '';

/** Modo personalizado de cotización: secciones → grupos → ítems. */
const tablaSecciones = (sections: any[]): string =>
  sections.map(section => {
    const grupos = (section.groups || [])
      .map((g: any) => {
        const items = (g.items || []).filter(esLineaUsada);
        if (!items.length) return '';
        return `
        <tr class="grupo"><td colspan="3">${esc(g.label)}</td></tr>
        ${items.map((i: any) => {
          const medida = (i.unit === 'ML' || i.unit === 'M2') && i.measure
            ? ` · ${i.measure} ${i.unit}` : '';
          return `<tr>
            <td>${esc(i.description)}<span class="detalle">x${i.quantity}${medida}</span>${fotos(i.images)}</td>
            <td class="num">${formatCurrency(i.unitCost || 0)}</td>
            <td class="num">${formatCurrency(computeLineSubtotal(i))}</td>
          </tr>`;
        }).join('')}`;
      })
      .join('');

    if (!grupos) return '';
    return `
    <h3 class="seccion">${esc(section.name)}</h3>
    <table>
      <thead><tr><th>Ítem</th><th class="num">Costo unit.</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${grupos}</tbody>
    </table>`;
  }).join('');

const totales = (d: any): string => {
  const filas: string[] = [];
  if (d.subtotal != null && d.subtotal !== d.total) filas.push(`<div class="tot"><span>Subtotal</span><span>${formatCurrency(d.subtotal)}</span></div>`);
  if (d.taxType === 'percentage' && d.taxAmount) filas.push(`<div class="tot"><span>Impuesto (${d.taxPercentage || 0}%)</span><span>${formatCurrency(d.taxAmount)}</span></div>`);
  if (d.taxType === 'aiu' && d.taxAmount) filas.push(`<div class="tot"><span>AIU</span><span>${formatCurrency(d.taxAmount)}</span></div>`);
  filas.push(`<div class="tot total"><span>Total</span><span>${formatCurrency(d.total || d.amount || 0)}</span></div>`);
  return `<div class="totales">${filas.join('')}</div>`;
};

const cuerpo = (type: DocType, d: any): string => {
  switch (type) {
    case 'quote':
      return `
        ${fila('Cliente', d.clientName)}
        ${fila('Dirección', d.clientAddress)}
        ${fila('Teléfono', d.clientPhone)}
        ${fila('Válida hasta', fecha(d.validUntil))}
        ${d.sections?.length ? tablaSecciones(d.sections) : tablaItems(d.items || [])}
        ${totales(d)}`;

    case 'invoice':
      return `
        ${fila('Cliente', d.clientName)}
        ${fila('Fecha', fecha(d.date))}
        ${fila('Estado', d.status === 'Paid' ? 'Pagada' : 'Pendiente')}
        ${tablaItems(d.items || [])}
        ${totales(d)}`;

    case 'collection_account':
      return `
        ${fila('Dirigido a', d.directedTo)}
        ${fila('NIT / Cédula', d.nit)}
        ${fila('Concepto', d.concept)}
        ${fila('Fecha', fecha(d.date))}
        ${d.accountNumber ? `
        <h3 class="seccion">Datos para el pago</h3>
        ${fila('Banco', d.bankName)}
        ${fila('Tipo de cuenta', d.accountType)}
        ${fila('Número', d.accountNumber)}
        ${fila('Titular', d.holderName)}` : ''}
        ${totales(d)}`;

    case 'receipt':
    case 'expense_receipt':
      return `
        ${fila('Concepto', d.concept)}
        ${fila('Forma de pago', d.paymentMethod)}
        ${fila('Fecha', fecha(d.date))}
        ${totales(d)}`;

    default:
      return '';
  }
};

interface DocumentoCompartido {
  type: DocType;
  data: any;
  businessLogo?: string;
  digitalSignature?: string;
  userProfile?: { businessName?: string; ownerName?: string; phone?: string; city?: string; nit?: string } | null;
}

/** Documento completo. `pieCatalogo` es el bloque de QR, ya maquetado. */
export const buildDocumentHtml = (doc: DocumentoCompartido, pieCatalogo = ''): string => {
  const d = doc.data || {};
  const p = doc.userProfile || {};
  const titulo = TITULOS[doc.type] || 'Documento';
  const negocio = p.businessName || p.ownerName || '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} ${esc(d.number || '')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#0f172a;line-height:1.5;padding:16px}
  .hoja{max-width:760px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(15,23,42,.12)}
  header{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:24px;display:flex;align-items:center;gap:14px}
  header img{width:52px;height:52px;border-radius:12px;object-fit:cover;background:#fff;flex-shrink:0}
  header .n{font-size:1.15rem;font-weight:700}
  header .m{opacity:.85;font-size:.82rem}
  .tit{padding:18px 24px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px}
  .tit h1{font-size:1.25rem;color:#1e293b}
  .tit span{color:#64748b;font-size:.85rem;font-weight:600}
  .cont{padding:20px 24px}
  .dato{display:flex;justify-content:space-between;gap:16px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:.9rem}
  .dato span{color:#64748b}
  .dato strong{text-align:right;color:#0f172a}
  .seccion{font-size:.82rem;text-transform:uppercase;letter-spacing:.04em;color:#2563eb;margin:22px 0 8px;font-weight:700}
  table{width:100%;border-collapse:collapse;margin:14px 0;font-size:.88rem}
  th{background:#f8fafc;color:#475569;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;padding:9px;text-align:left;border-bottom:2px solid #e2e8f0}
  td{padding:9px;border-bottom:1px solid #f1f5f9;vertical-align:top}
  .num{text-align:right;white-space:nowrap}
  .grupo td{background:#f8fafc;font-weight:700;font-size:.75rem;text-transform:uppercase;color:#64748b;letter-spacing:.03em}
  .detalle{display:block;color:#94a3b8;font-size:.78rem;margin-top:2px}
  .totales{margin-top:18px;border-top:2px solid #e2e8f0;padding-top:12px}
  .tot{display:flex;justify-content:space-between;padding:5px 0;font-size:.9rem;color:#475569}
  .tot.total{font-size:1.15rem;font-weight:700;color:#2563eb;border-top:1px solid #e2e8f0;margin-top:6px;padding-top:10px}
  .firma{margin-top:26px;text-align:center}
  .firma img{max-width:190px;max-height:80px}
  .fotos{display:flex;gap:6px;margin-top:6px}
  .fotos img{width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0}
  .firma p{border-top:1px solid #94a3b8;display:inline-block;padding-top:5px;margin-top:5px;color:#64748b;font-size:.8rem}
  footer{text-align:center;color:#94a3b8;font-size:.75rem;padding:20px}
  @media print{body{background:#fff;padding:0}.hoja{box-shadow:none}}
</style>
</head>
<body>
  <div class="hoja">
    <header>
      ${doc.businessLogo ? `<img src="${esc(doc.businessLogo)}" alt="">` : ''}
      <div>
        <div class="n">${esc(negocio)}</div>
        <div class="m">${[p.city, p.phone, p.nit ? `NIT ${p.nit}` : ''].filter(Boolean).map(esc).join(' · ')}</div>
      </div>
    </header>

    <div class="tit">
      <h1>${esc(titulo)}</h1>
      ${d.number ? `<span>N.º ${esc(d.number)}</span>` : ''}
    </div>

    <div class="cont">
      ${cuerpo(doc.type, d)}
      ${doc.digitalSignature ? `
      <div class="firma">
        <img src="${esc(doc.digitalSignature)}" alt="Firma">
        <p>${esc(p.ownerName || negocio)}</p>
      </div>` : ''}
      ${pieCatalogo}
    </div>
  </div>
  <footer>Generado con Worky · ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</footer>
</body>
</html>`;
};
