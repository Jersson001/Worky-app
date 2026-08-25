/**
 * Catálogo público compartible.
 *
 * El visitante entra sin registrarse, así que el catálogo no puede depender de
 * una sesión ni de leer la tabla `products`: se publica una instantánea como
 * HTML autónomo en Storage, igual que ya se hacía con los documentos. Así no
 * hay que abrir permisos de lectura sobre los datos de nadie.
 *
 * La URL es estable por usuario (`shared_catalogs/<userId>.html`), de modo que
 * el QR impreso sigue sirviendo después de actualizar el catálogo.
 */
import { supabase, PUBLIC_BUCKET } from './supabaseConfig';
import { getCurrentUserId } from './messagingService';
import { Product, UserProfileData } from '../types';

/** Dónde vive la app en la web; a donde va quien quiera registrarse. */
export const WORKY_APP_URL = 'https://worky-app-khaki.vercel.app';

const CATALOG_DIR = 'shared_catalogs';

/** Escapa texto que entra en el HTML: los nombres los escribe el usuario. */
const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const money = (n: number): string => `$ ${(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;

/** Imagen del QR. Servicio externo, el mismo que ya usan cotizaciones y recibos. */
export const qrImageUrl = (data: string, size = 300): string =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

/** URL pública del catálogo de un usuario. Estable: no cambia al republicar. */
export const catalogUrl = (userId: string): string => {
  const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(`${CATALOG_DIR}/${userId}.html`);
  return data?.publicUrl ?? '';
};

// ─── Página ──────────────────────────────────────────────────────────────────

const productCard = (p: Product): string => {
  const img = p.image || p.images?.[0] || '';
  return `
      <article class="card">
        ${img ? `<img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">` : '<div class="sin-foto">Sin foto</div>'}
        <div class="card-body">
          <h3>${esc(p.name)}</h3>
          ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
          <p class="precio">${money(p.price)}</p>
        </div>
      </article>`;
};

/**
 * HTML autónomo del catálogo. Sin dependencias externas salvo la imagen del QR,
 * para que abra rápido y funcione aunque el visitante no tenga la app.
 */
export const buildCatalogHtml = (
  profile: Pick<UserProfileData, 'businessName' | 'ownerName' | 'phone' | 'city' | 'businessLogo'>,
  products: Product[],
): string => {
  const negocio = esc(profile.businessName || profile.ownerName || 'Catálogo');
  const cards = products.map(productCard).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${negocio} — Catálogo</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#0f172a;line-height:1.5}
  .wrap{max-width:960px;margin:0 auto;padding:16px}
  header{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:28px 16px;text-align:center}
  header img{width:72px;height:72px;border-radius:16px;object-fit:cover;margin-bottom:12px;background:#fff}
  header h1{font-size:1.5rem;font-weight:700}
  header p{opacity:.85;font-size:.9rem;margin-top:4px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin:20px 0}
  .card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.1);display:flex;flex-direction:column}
  .card img{width:100%;height:180px;object-fit:cover;display:block}
  .sin-foto{height:180px;display:flex;align-items:center;justify-content:center;background:#e2e8f0;color:#94a3b8;font-size:.85rem}
  .card-body{padding:12px;display:flex;flex-direction:column;gap:6px;flex:1}
  .card h3{font-size:.95rem;font-weight:600}
  .desc{font-size:.82rem;color:#64748b;flex:1}
  .precio{font-size:1.05rem;font-weight:700;color:#2563eb}
  .cta{background:#fff;border-radius:14px;padding:24px 16px;text-align:center;box-shadow:0 1px 3px rgba(15,23,42,.1);margin-bottom:24px}
  .cta h2{font-size:1.1rem;margin-bottom:6px}
  .cta p{color:#64748b;font-size:.88rem;margin-bottom:14px}
  .btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:.92rem}
  .vacio{background:#fff;border-radius:14px;padding:40px 16px;text-align:center;color:#94a3b8;font-style:italic}
  footer{text-align:center;color:#94a3b8;font-size:.78rem;padding:0 16px 28px}
</style>
</head>
<body>
  <header>
    ${profile.businessLogo ? `<img src="${esc(profile.businessLogo)}" alt="${negocio}">` : ''}
    <h1>${negocio}</h1>
    ${profile.city ? `<p>${esc(profile.city)}</p>` : ''}
  </header>

  <div class="wrap">
    ${products.length
      ? `<div class="grid">${cards}</div>`
      : '<div class="vacio">Este catálogo aún no tiene productos.</div>'}

    <div class="cta">
      <h2>¿Te interesa algo?</h2>
      <p>Escríbenos por Worky para cotizar, preguntar por disponibilidad o hacer un pedido.</p>
      <a class="btn" href="${WORKY_APP_URL}" target="_blank" rel="noopener">Chatear con ${negocio}</a>
    </div>

    <footer>
      Catálogo actualizado el ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
      Hecho con Worky
    </footer>
  </div>
</body>
</html>`;
};

// ─── Preparación de imágenes ─────────────────────────────────────────────────

const MAX_LADO = 800;
const CALIDAD = 0.72;

/**
 * Reescala una imagen a un lado máximo y la devuelve como JPEG.
 *
 * Hace falta porque las fotos de producto se guardan como data URL en base64:
 * una foto de móvil son 4-6 MB, y con quince productos el catálogo pesaría más
 * de 100 MB — inservible por datos móviles, que es como se abre un QR.
 *
 * Si la imagen no se puede procesar (por ejemplo una URL remota, que ensucia
 * el canvas) se devuelve tal cual: no pesa en el HTML de todos modos.
 */
const reescalar = (src: string): Promise<string> =>
  new Promise(resolve => {
    if (!src || !src.startsWith('data:')) return resolve(src);

    const img = new Image();
    img.onload = () => {
      try {
        const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
        if (escala === 1 && src.length < 200_000) return resolve(src);

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', CALIDAD));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve('');
    img.src = src;
  });

/** Copia de los productos con la imagen principal aligerada. */
export const prepararProductos = async (products: Product[]): Promise<Product[]> =>
  Promise.all(
    products.map(async p => ({
      ...p,
      image: await reescalar(p.image || p.images?.[0] || ''),
      images: undefined, // el catálogo solo muestra la principal
    })),
  );

// ─── Publicación ─────────────────────────────────────────────────────────────

/**
 * Sube la instantánea del catálogo y devuelve su URL pública.
 * Sobrescribe la anterior: la URL y el QR siguen siendo los mismos.
 */
export const publishCatalog = async (
  userId: string,
  profile: Parameters<typeof buildCatalogHtml>[0],
  products: Product[],
): Promise<string> => {
  const html = buildCatalogHtml(profile, await prepararProductos(products));
  const { error } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .upload(`${CATALOG_DIR}/${userId}.html`, new Blob([html], { type: 'text/html' }), {
      contentType: 'text/html',
      upsert: true,
    });

  // Se propaga en vez de devolver null: quien llama decide si lo muestra.
  // Con null, el fallo llegaba a la pantalla como "revisa tu conexión", que
  // casi nunca es la causa real.
  if (error) throw error;
  return catalogUrl(userId);
};

/**
 * Publica el catálogo del usuario actual leyendo sus productos.
 *
 * Existe para que el flujo de documentos no tenga que recibir la lista de
 * productos por props: DocumentViewer se renderiza desde sitios que no la
 * tienen. Devuelve null si no hay sesión, no hay productos o falla la subida,
 * y en ese caso el documento simplemente sale sin el bloque de catálogo.
 */
export const publishCatalogForCurrentUser = async (
  profile: Parameters<typeof buildCatalogHtml>[0],
): Promise<string | null> => {
  try {
    const userId = getCurrentUserId();
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, image, images, description')
      .eq('user_id', userId);

    if (error) throw error;
    if (!data?.length) return null;

    return publishCatalog(userId, profile, data as Product[]);
  } catch (e) {
    console.warn('No se pudo publicar el catálogo para el documento:', e);
    return null;
  }
};
