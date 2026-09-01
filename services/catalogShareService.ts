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
import { reducirImagen } from '../utils/imagen';
import { getCurrentUserId } from './messagingService';
import { Product, ProductCategory, UserProfileData } from '../types';

/** La app publicada. El destino por defecto de todo lo que se comparte. */
const APP_PUBLICADA = 'https://worky-app-khaki.vercel.app';

/**
 * El origen actual, si sirve para compartirlo con alguien.
 *
 * No sirve en dos sitios, y son justo donde más se generan enlaces:
 *
 * - En el APK. Capacitor no carga la app de un servidor sino del propio
 *   teléfono, así que el origen es `localhost` y apunta al aparato de quien
 *   escanea. Un QR así no lleva a ninguna parte.
 * - Desarrollando en local, por lo mismo.
 *
 * Fuera de esos casos el origen es una URL de verdad —producción o el preview
 * que Vercel levanta por cada rama— y es mejor que la fija: así los enlaces
 * generados en un preview se quedan dentro del preview y se puede probar el
 * recorrido completo del QR antes de publicar. Con la URL fija, un QR hecho en
 * el preview llevaba a producción y parecía que el cambio no funcionaba.
 */
const origenCompartible = (): string | null => {
  try {
    const { protocol, hostname, origin } = window.location;
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.local');
    return local ? null : origin;
  } catch {
    // Sin `window` —cualquier ejecución fuera del navegador— manda la publicada.
    return null;
  }
};

/**
 * Dónde vive la app; a donde va quien quiera registrarse.
 *
 * Se resuelve una sola vez al cargar: el origen no cambia mientras la página
 * está abierta, y así todos los sitios que ya lo usaban siguen leyendo una
 * constante.
 */
export const WORKY_APP_URL = origenCompartible() ?? APP_PUBLICADA;

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

/**
 * URL de un objeto de Storage. Interna: no sirve para compartir.
 *
 * Supabase devuelve todo HTML público de Storage con `Content-Type: text/plain`
 * y `X-Content-Type-Options: nosniff` —para que nadie aloje páginas en su
 * dominio—, así que abrir esta URL muestra el código fuente, no la página.
 * Por eso el catálogo se sirve desde la app y esto solo se usa para bajarlo.
 */
const objectUrl = (ruta: string): string => {
  const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(ruta);
  return data?.publicUrl ?? '';
};

/**
 * Cada publicación estrena nombre de archivo.
 *
 * El bucket solo admite INSERT: no tiene política de UPDATE, así que sobrescribir
 * con `upsert` devolvía "new row violates row-level security policy" en la
 * segunda publicación. Con un nombre nuevo cada vez solo hacen falta inserciones.
 * Se puede porque el QR ya no apunta al objeto sino a la app, que resuelve cuál
 * es la instantánea vigente: el enlace impreso sigue siendo el mismo.
 *
 * El nombre es el instante en milisegundos, y todos tienen los mismos dígitos
 * hasta el año 2286, así que ordenar por nombre es ordenar por fecha.
 */
const nuevaInstantanea = (userId: string): string =>
  `${CATALOG_DIR}/${userId}/${Date.now()}.html`;

/**
 * Ruta de la instantánea vigente: la última publicada.
 *
 * Listar no necesita sesión —el bucket tiene lectura pública— que es lo que
 * hace falta, porque quien abre el catálogo es un visitante cualquiera.
 */
const ultimaInstantanea = async (userId: string): Promise<string | null> => {
  const { data } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .list(`${CATALOG_DIR}/${userId}`, { limit: 100, sortBy: { column: 'name', order: 'desc' } });

  const reciente = data?.find(o => o.name.endsWith('.html'));
  return reciente ? `${CATALOG_DIR}/${userId}/${reciente.name}` : null;
};

/**
 * URL que se comparte: la del QR y la del enlace. Estable por usuario, así que
 * el QR impreso sigue sirviendo después de republicar.
 */
export const catalogPageUrl = (userId: string): string =>
  `${WORKY_APP_URL}/?catalogo=${userId}`;

/**
 * Enlace de «Chatear»: entra a la app diciendo con quién quiere hablar.
 *
 * Es lo que convierte un QR escaneado en una conversación. La app se guarda ese
 * id mientras el visitante se registra y, al terminar, le crea el contacto y le
 * abre el chat: sin esto aterrizaba en una app vacía sin saber con quién
 * estaba hablando.
 */
export const chatInviteUrl = (userId: string): string =>
  `${WORKY_APP_URL}/?vendedor=${userId}`;

/** Baja la instantánea vigente. La usa la página pública del catálogo. */
export const fetchCatalogHtml = async (userId: string): Promise<string | null> => {
  try {
    // El nombre fijo es de los catálogos publicados antes de este cambio: sirve
    // hasta que su dueño republique, y entonces deja de mirarse.
    const ruta = (await ultimaInstantanea(userId)) ?? `${CATALOG_DIR}/${userId}.html`;
    const res = await fetch(objectUrl(ruta));
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
};

// ─── Vendedor pendiente ──────────────────────────────────────────────────────

const VENDEDOR_KEY = 'worky:vendedor-pendiente';

/**
 * Se queda con el `?vendedor=` del enlace y limpia la URL.
 *
 * Hace falta guardarlo porque entre que llega y termina de registrarse hay un
 * camino largo —formulario, confirmación por correo, onboarding— y en algún
 * punto la URL se pierde. Sin esto, el cliente aterriza en una app vacía sin
 * saber con quién iba a hablar, que es justo lo que se quería evitar.
 */
export const recordarVendedorDeLaUrl = (): string | null => {
  try {
    const url = new URL(window.location.href);
    const vendedor = url.searchParams.get('vendedor');
    if (vendedor) {
      localStorage.setItem(VENDEDOR_KEY, vendedor);
      localStorage.setItem(INVITADO_KEY, '1');
      // La URL se limpia para que recargar no reviva una invitación ya usada.
      url.searchParams.delete('vendedor');
      window.history.replaceState({}, '', url.toString());
    }
    return vendedor || localStorage.getItem(VENDEDOR_KEY);
  } catch {
    return null;
  }
};

/**
 * Marca de "esta persona llegó invitada", aparte del vendedor pendiente.
 *
 * Hace falta porque el vendedor pendiente se borra en cuanto se crea el
 * contacto, y eso pasa *antes* de que se decida si hay que enseñarle el
 * formulario de negocio: sin esta marca, el alta exprés no se enteraba de que
 * venía invitada y le sacaba el formulario igual.
 */
const INVITADO_KEY = 'worky:llego-invitado';

export const llegoInvitado = (): boolean => {
  try {
    return localStorage.getItem(INVITADO_KEY) === '1';
  } catch {
    return false;
  }
};

export const olvidarLlegadaInvitada = (): void => {
  try {
    localStorage.removeItem(INVITADO_KEY);
  } catch {
    /* nada que olvidar */
  }
};

export const vendedorPendiente = (): string | null => {
  try {
    return localStorage.getItem(VENDEDOR_KEY);
  } catch {
    return null;
  }
};

/** Lo que el cliente marcó en el catálogo antes de tener cuenta. */
export interface PedidoPendiente {
  vendedor: string;
  nota: string;
  productos: { nombre: string; imagen?: string }[];
}

const PEDIDO_KEY = 'worky:pedido-pendiente';

/**
 * Guarda la selección hecha en el catálogo para mandarla al entrar.
 *
 * Quien marca los productos todavía no tiene cuenta, y los mensajes necesitan
 * sesión: la selección tiene que sobrevivir al registro igual que el vendedor.
 *
 * Las fotos van como data URL y ocupan; si no caben, se guarda el pedido sin
 * ellas antes que perderlo entero — con los nombres y la nota el vendedor ya
 * entiende qué le están pidiendo.
 */
export const guardarPedidoPendiente = (pedido: PedidoPendiente): void => {
  try {
    localStorage.setItem(PEDIDO_KEY, JSON.stringify(pedido));
  } catch {
    try {
      const sinFotos = { ...pedido, productos: pedido.productos.map(({ nombre }) => ({ nombre })) };
      localStorage.setItem(PEDIDO_KEY, JSON.stringify(sinFotos));
    } catch {
      /* sin sitio: se pierde la selección, no la vinculación */
    }
  }
};

export const pedidoPendiente = (): PedidoPendiente | null => {
  try {
    const crudo = localStorage.getItem(PEDIDO_KEY);
    return crudo ? (JSON.parse(crudo) as PedidoPendiente) : null;
  } catch {
    return null;
  }
};

export const olvidarPedidoPendiente = (): void => {
  try {
    localStorage.removeItem(PEDIDO_KEY);
  } catch {
    /* nada que olvidar */
  }
};

export const olvidarVendedorPendiente = (): void => {
  try {
    localStorage.removeItem(VENDEDOR_KEY);
  } catch {
    /* sin localStorage no hay nada que olvidar */
  }
};

// ─── Página ──────────────────────────────────────────────────────────────────

/**
 * Cuántas fotos por producto llegan al catálogo publicado.
 *
 * Hay tope porque las fotos van incrustadas como data URL dentro de la
 * instantánea: cada una suma al archivo que se baja el visitante ANTES de ver
 * nada. Un proveedor con 30 modelos a 4 fotos ya son 120 imágenes en un solo
 * HTML. Cuatro dan para frente, espalda y dos detalles, que es lo que se
 * enseña de una prenda.
 */
export const MAX_FOTOS_POR_PRODUCTO = 4;

/**
 * Las fotos de un producto, en orden y sin repetir.
 *
 * `image` suele ser además `images[0]`, así que sin deduplicar la primera foto
 * salía dos veces en la galería.
 */
const fotosDe = (p: Product): string[] =>
  [...new Set([p.image, ...(p.images ?? [])].filter(Boolean) as string[])].slice(0, MAX_FOTOS_POR_PRODUCTO);

/**
 * Tarjeta de producto, con su galería y la foto ampliable al pulsarla.
 *
 * El visor no lleva JavaScript porque la instantánea se pinta en un iframe con
 * `sandbox` y sin `allow-scripts`: ahí dentro no corre ni una línea de script, y
 * abrirle ese permiso a contenido publicado por un usuario para poder ampliar
 * una foto no compensa.
 *
 * Se usa `details` y NO un visor `:target`, aunque el segundo es el truco
 * habitual. La instantánea se monta con `srcdoc`, y ahí la URL base se hereda
 * del documento padre: un `href="#foto-3"` no ancla dentro de la página, navega
 * el iframe a la app con ese fragmento. Comprobado en el navegador — la app
 * entera se cargaba dentro del marco. `details` no navega: es estado del
 * elemento.
 *
 * Al ampliar se reutiliza la MISMA etiqueta `img`, agrandada con CSS, en vez de
 * repetirla dentro de un visor aparte. Con las fotos incrustadas como data URL,
 * duplicarlas duplicaría el peso de la instantánea.
 */
const productCard = (p: Product): string => {
  const [principal, ...resto] = fotosDe(p);
  const visor = (src: string, alt: string, clase: string) =>
    `<details class="foto ${clase}">
            <summary title="Pulsa para ampliar"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"></summary>
          </details>`;

  return `
      <article class="card">
        ${principal
          ? `<div class="galeria">
          ${visor(principal, p.name, 'principal')}
          ${resto.length
              ? `<div class="miniaturas">${resto
                  .map((src, i) => visor(src, `${p.name} (foto ${i + 2})`, 'mini'))
                  .join('')}</div>`
              : ''}
        </div>`
          : '<div class="sin-foto">Sin foto</div>'}
        <div class="card-body">
          <h3>${esc(p.name)}</h3>
          ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
          ${p.price ? `<p class="precio">${money(p.price)}</p>` : '<p class="precio sin-precio">Consultar precio</p>'}
        </div>
      </article>`;
};

const grid = (productos: Product[]): string =>
  `<div class="grid">${productos.map(productCard).join('')}</div>`;

/**
 * Reparte los productos en sus carpetas, respetando el orden de las carpetas.
 *
 * Lo que no tiene carpeta —o la tiene borrada— cae en un grupo sin nombre que
 * se pinta al final: perder un producto por no encontrar su carpeta sería peor
 * que enseñarlo suelto.
 */
const porCarpeta = (
  products: Product[],
  categories: ProductCategory[],
): Array<{ nombre: string; icono?: string; color?: string; portada?: string; productos: Product[] }> => {
  type Grupo = { nombre: string; icono?: string; color?: string; portada?: string; productos: Product[] };
  const conocidas = new Set(categories.map(c => c.id));
  const grupos: Grupo[] = categories
    .map(c => ({
      nombre: c.name,
      icono: c.icon,
      color: c.color,
      portada: c.coverImage,
      productos: products.filter(p => p.categoryId === c.id),
    }))
    .filter(g => g.productos.length > 0);

  const sueltos = products.filter(p => !p.categoryId || !conocidas.has(p.categoryId));
  if (sueltos.length) grupos.push({ nombre: 'Otros', productos: sueltos });

  return grupos;
};

/**
 * HTML autónomo del catálogo. Sin dependencias externas salvo la imagen del QR,
 * para que abra rápido y funcione aunque el visitante no tenga la app.
 */
export const buildCatalogHtml = (
  profile: Pick<UserProfileData, 'businessName' | 'ownerName' | 'phone' | 'city' | 'businessLogo'>,
  products: Product[],
  userId?: string,
  categories: ProductCategory[] = [],
): string => {
  const negocio = esc(profile.businessName || profile.ownerName || 'Catálogo');

  // Con una sola carpeta no se pinta ninguna: una carpeta suelta que hay que
  // abrir solo esconde el catálogo y hace pensar que falta algo. Es el mismo
  // criterio que con las pestañas de la cotización.
  const grupos = porCarpeta(products, categories);
  const conCarpetas = grupos.length > 1;

  // Las carpetas se pintan como fichas con su portada, y al pulsar una se entra:
  // las demás se ocultan y quedan sus productos. Ninguna abierta de entrada,
  // porque lo primero que tiene que ver el visitante es en qué está dividido
  // todo. Se sale volviendo a pulsar la ficha, que arriba hace de cabecera.
  const cuerpo = conCarpetas
    ? `<div class="carpetas">${grupos
        .map(
          g => `
      <details class="carpeta">
        <summary class="ficha">
          ${g.portada
            ? `<img class="portada" src="${esc(g.portada)}" alt="${esc(g.nombre)}" loading="lazy">`
            // La inicial y no el icono de la carpeta: la instantánea no carga
            // Font Awesome —es HTML autónomo a propósito— y un <i class="fa-…">
            // ahí dentro no pinta nada, así que la ficha salía en blanco.
            : `<span class="portada sin-portada" style="background:${esc(g.color || '#2563eb')}">${esc(g.nombre.slice(0, 1).toUpperCase())}</span>`}
          <span class="pie"><span class="nombre">${esc(g.nombre)}</span><span class="cuenta">${g.productos.length}</span></span>
        </summary>
        ${grid(g.productos)}
      </details>`,
        )
        .join('')}</div>`
    : grid(products);

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

  /* Carpetas como fichas. El elemento details es nativo: se abre y se cierra sin
     una linea de script, que es la unica forma de que funcione en el sandbox. */
  .carpetas{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px;margin:20px 0}
  .carpeta{background:#fff;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.1);overflow:hidden}
  .carpeta>summary{list-style:none;cursor:pointer;user-select:none;display:block}
  .carpeta>summary::-webkit-details-marker{display:none}
  .ficha .portada{display:block;width:100%;height:110px;object-fit:cover}
  .ficha .sin-portada{display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.8rem;font-weight:700}
  .ficha .pie{display:flex;align-items:center;gap:8px;padding:10px 12px;font-weight:700;font-size:.95rem}
  /* Dos lineas antes de cortar: «Cocinas integrales» en una sola sale como
     «Cocinas inte…», que no dice cual es. */
  .ficha .nombre{flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
                 overflow:hidden;line-height:1.25}
  .ficha .cuenta{background:#eff6ff;color:#2563eb;border-radius:999px;padding:2px 10px;font-size:.75rem;flex:none}

  /* Dentro de una carpeta: ocupa el ancho entero y las demas se apartan, para
     que se sienta que se ha entrado y no que se ha desplegado un acordeon.
     Si el navegador no entiende :has, se queda en acordeon y sigue sirviendo. */
  .carpeta[open]{grid-column:1/-1}
  .carpetas:has(.carpeta[open])>.carpeta:not([open]){display:none}
  /* La cabecera de la carpeta abierta NO va sticky: con top:52px Chrome le mete
     esos 52px de hueco por encima aunque la pagina este sin desplazar, y la
     ficha aparecia con una franja blanca. Lo unico fijo es barra-chat. */
  .carpeta[open]>summary{background:#fff;border-bottom:1px solid #e2e8f0}
  .carpeta[open] .ficha .portada{height:0}
  .carpeta[open] .ficha .pie::before{content:'←';color:#2563eb;font-size:1.1rem;margin-right:2px}
  .carpeta[open] .ficha .pie{padding:14px 16px}
  .carpeta .grid{margin:0;padding:14px 16px}

  /* Galeria: la principal grande y TODAS las demas debajo, a la vista. Antes
     era un carrusel y solo se veia una: quien abria la carpeta creia que el
     producto tenia una sola foto, porque hay que descubrir que se arrastra. */
  .galeria{position:relative}
  .miniaturas{display:flex;flex-wrap:wrap;gap:6px;padding:8px 8px 0}
  .miniaturas .mini img{width:56px;height:56px;object-fit:cover;border-radius:8px}
  .miniaturas .mini>summary{border-radius:8px;overflow:hidden}

  /* Visor de foto: la misma imagen, agrandada al abrir su details. Sin script y
     sin anclas, que dentro de un srcdoc navegarian fuera de la pagina. */
  .foto{margin:0}
  .foto>summary{list-style:none;display:block;cursor:zoom-in}
  .foto>summary::-webkit-details-marker{display:none}
  .foto[open]>summary{cursor:zoom-out}
  .foto[open]>summary::before{content:'';position:fixed;inset:0;z-index:20;background:rgba(2,6,23,.94)}
  .foto[open] img{position:fixed;inset:20px;margin:auto;z-index:21;width:auto;height:auto;
                  max-width:calc(100% - 40px);max-height:calc(100% - 40px);object-fit:contain;border-radius:10px}
  .card-body{padding:12px;display:flex;flex-direction:column;gap:6px;flex:1}
  .card h3{font-size:.95rem;font-weight:600}
  .desc{font-size:.82rem;color:#64748b;flex:1}
  .precio{font-size:1.05rem;font-weight:700;color:#2563eb}
  .sin-precio{font-size:.9rem;color:#64748b}
  /* Sin boton aqui abajo: el de chatear va fijo arriba y repetirlo al final
     ponia dos botones identicos en la misma pantalla. Queda solo el texto. */
  .cierre{text-align:center;color:#64748b;font-size:.88rem;margin:4px 0 22px;padding:0 8px}
  .btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:.92rem}

  /* Chatear, siempre a la vista. Es la unica accion que de verdad importa: el
     visitante puede decidirse en cualquier producto, no solo al final. */
  .barra-chat{position:sticky;top:0;z-index:15;background:rgba(241,245,249,.94);
              backdrop-filter:blur(8px);padding:8px 16px;border-bottom:1px solid #e2e8f0}
  .barra-chat .btn{display:block;text-align:center;padding:11px 16px}
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

  <div class="barra-chat">
    <a class="btn" href="${userId ? chatInviteUrl(userId) : WORKY_APP_URL}" target="_blank" rel="noopener">💬 Chatear con ${negocio}</a>
  </div>

  <div class="wrap">
    ${products.length
      ? cuerpo
      : '<div class="vacio">Este catálogo aún no tiene productos.</div>'}

    <p class="cierre">¿Te interesa algo? Escríbenos por Worky para cotizar,
      preguntar por disponibilidad o hacer un pedido.</p>

    <footer>
      Catálogo actualizado el ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
      Hecho con Worky
    </footer>
  </div>
</body>
</html>`;
};

// ─── Preparación de imágenes ─────────────────────────────────────────────────

/**
 * Copia de los productos con sus fotos aligeradas.
 *
 * Antes solo se aligeraba la principal y las demás se tiraban. Ahora van todas
 * —hasta `MAX_FOTOS_POR_PRODUCTO`—, porque de una prenda hay que ver el frente
 * y la espalda, y ese era el motivo de que un proveedor tuviera que mandar las
 * fotos sueltas por otro lado.
 *
 * Se reducen TODAS, no solo la primera: son las que engordan la instantánea.
 */
export const prepararProductos = async (products: Product[]): Promise<Product[]> =>
  Promise.all(
    products.map(async p => {
      const reducidas = await Promise.all(fotosDe(p).map(reducirImagen));
      return { ...p, image: reducidas[0] ?? '', images: reducidas.slice(1) };
    }),
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
  categories: ProductCategory[] = [],
): Promise<string> => {
  const html = buildCatalogHtml(profile, await prepararProductos(products), userId, categories);
  // Sin `upsert`: cada publicación es un archivo nuevo, ver nuevaInstantanea.
  const { error } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .upload(nuevaInstantanea(userId), new Blob([html], { type: 'text/html' }), {
      contentType: 'text/html',
    });

  // Se propaga en vez de devolver null: quien llama decide si lo muestra.
  // Con null, el fallo llegaba a la pantalla como "revisa tu conexión", que
  // casi nunca es la causa real.
  if (error) throw error;
  return catalogPageUrl(userId);
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
      .select('id, name, price, image, images, description, category_id')
      .eq('user_id', userId);

    if (error) throw error;
    if (!data?.length) return null;

    const productos = data.map((p: any) => ({ ...p, categoryId: p.category_id })) as Product[];

    // Las carpetas son secundarias: si fallan, el catálogo sale plano, que es
    // como salía hasta ahora. Perder la publicación entera por esto sería peor.
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, icon, color, cover_image')
      .eq('user_id', userId);

    const carpetas = (cats ?? []).map((c: any) => ({ ...c, coverImage: c.cover_image })) as ProductCategory[];

    return publishCatalog(userId, profile, productos, carpetas);
  } catch (e) {
    console.warn('No se pudo publicar el catálogo para el documento:', e);
    return null;
  }
};
