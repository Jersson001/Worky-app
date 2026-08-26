/**
 * Página pública del catálogo: lo que ve quien escanea el QR.
 *
 * No es React a propósito: se pinta antes de montar la app, porque quien llega
 * aquí no tiene sesión y no debe toparse con el login. Vive fuera de index.tsx
 * porque ya no es sólo enseñar la instantánea: también deja reenviarla y pedir
 * productos.
 */
import { fetchCatalogHtml, guardarPedidoPendiente } from '../services/catalogShareService';

interface ProductoDelCatalogo {
  nombre: string;
  precio: string;
  imagen?: string;
}

const FUENTE = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

const aviso = (texto: string) => {
  document.body.innerHTML =
    `<p style="font-family:${FUENTE};color:#64748b;text-align:center;padding:48px 24px">${texto}</p>`;
};

const boton = (texto: string, fondo: string, alPulsar: () => void): HTMLButtonElement => {
  const b = document.createElement('button');
  b.textContent = texto;
  b.style.cssText =
    'border:0;cursor:pointer;padding:10px 18px;border-radius:999px;font-weight:700;' +
    `font-size:.85rem;background:${fondo};color:#fff;font-family:${FUENTE}`;
  b.onclick = alPulsar;
  return b;
};

/**
 * Saca los productos de la instantánea ya publicada.
 *
 * Se leen del HTML en vez de consultar la base porque el visitante no tiene
 * sesión y los productos de otro no son suyos para consultarlos. Además así
 * funciona con los catálogos publicados antes de todo esto, sin republicarlos.
 */
const leerProductos = (html: string): ProductoDelCatalogo[] => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('.card')].map(card => ({
    nombre: card.querySelector('h3')?.textContent?.trim() || 'Producto',
    precio: card.querySelector('.precio')?.textContent?.trim() || '',
    imagen: card.querySelector('img')?.getAttribute('src') || undefined,
  }));
};

const nombreDelNegocio = (html: string): string =>
  new DOMParser().parseFromString(html, 'text/html')
    .querySelector('header h1')?.textContent?.trim() || 'el vendedor';

/** Cuántos productos se dejan mandar de una vez, para no reventar el almacenamiento. */
const MAX_ELEGIDOS = 6;

/**
 * Selector de productos: se marcan, se escribe una nota y se manda.
 *
 * Lo dibuja la app y no la instantánea porque la instantánea se pinta en un
 * iframe con `sandbox` y sin `allow-scripts`: aquí hay sitio para interactuar
 * sin abrirle permisos a contenido publicado por un usuario.
 */
const selector = (userId: string, productos: ProductoDelCatalogo[], negocio: string): HTMLElement => {
  const elegidos = new Set<number>();

  const fondo = document.createElement('div');
  fondo.style.cssText =
    'position:fixed;inset:0;z-index:10;background:rgba(15,23,42,.6);display:flex;align-items:flex-end;' +
    `justify-content:center;font-family:${FUENTE}`;

  const panel = document.createElement('div');
  // El color se fija a mano: index.html le pone al body un gris casi blanco
  // pensado para el fondo oscuro de la app, y aquí el panel es blanco.
  panel.style.cssText =
    'background:#fff;color:#0f172a;width:100%;max-width:640px;max-height:88vh;overflow-y:auto;' +
    'border-radius:20px 20px 0 0;padding:20px;color-scheme:light';

  const titulo = document.createElement('h2');
  titulo.textContent = '¿Qué te interesa?';
  titulo.style.cssText = 'font-size:1.15rem;font-weight:700;color:#0f172a;margin-bottom:4px';

  const ayuda = document.createElement('p');
  ayuda.textContent = `Marca los productos y cuéntale a ${negocio} qué necesitas.`;
  ayuda.style.cssText = 'font-size:.85rem;color:#64748b;margin-bottom:14px';

  const rejilla = document.createElement('div');
  rejilla.style.cssText =
    'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:14px';

  const nota = document.createElement('textarea');
  nota.placeholder = 'Ej. los quiero en azul, ¿cuánto sale el envío?';
  nota.rows = 3;
  nota.style.cssText =
    'width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:10px;font-size:.9rem;' +
    'color:#0f172a;background:#fff;' +
    `font-family:${FUENTE};resize:vertical;margin-bottom:14px`;

  const enviar = boton('Enviar', '#2563eb', () => {
    guardarPedidoPendiente({
      vendedor: userId,
      nota: nota.value.trim(),
      productos: [...elegidos].map(i => ({ nombre: productos[i].nombre, imagen: productos[i].imagen })),
    });
    // A la app: allí se crea la cuenta si hace falta y el pedido sale solo.
    window.location.href = `/?vendedor=${encodeURIComponent(userId)}`;
  });

  const refrescarEnvio = () => {
    enviar.textContent = elegidos.size ? `Enviar ${elegidos.size} a ${negocio}` : 'Marca al menos uno';
    enviar.disabled = elegidos.size === 0;
    enviar.style.opacity = elegidos.size ? '1' : '.5';
    enviar.style.cursor = elegidos.size ? 'pointer' : 'default';
  };

  productos.forEach((p, i) => {
    const ficha = document.createElement('button');
    ficha.style.cssText =
      'border:2px solid #e2e8f0;background:#fff;border-radius:12px;overflow:hidden;cursor:pointer;' +
      'padding:0;text-align:left;display:flex;flex-direction:column';
    ficha.innerHTML =
      (p.imagen
        ? `<img src="${p.imagen}" alt="" style="width:100%;height:96px;object-fit:cover;display:block">`
        : '<div style="height:96px;background:#e2e8f0"></div>') +
      `<span style="padding:8px;font-size:.8rem;font-weight:600;color:#0f172a">${p.nombre}</span>`;

    ficha.onclick = () => {
      if (elegidos.has(i)) {
        elegidos.delete(i);
      } else {
        if (elegidos.size >= MAX_ELEGIDOS) {
          alert(`Puedes mandar hasta ${MAX_ELEGIDOS} productos de una vez.`);
          return;
        }
        elegidos.add(i);
      }
      const marcado = elegidos.has(i);
      ficha.style.borderColor = marcado ? '#2563eb' : '#e2e8f0';
      ficha.style.background = marcado ? '#eff6ff' : '#fff';
      refrescarEnvio();
    };

    rejilla.appendChild(ficha);
  });

  const pie = document.createElement('div');
  pie.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
  pie.append(boton('Cancelar', '#94a3b8', () => fondo.remove()), enviar);

  const avisoCuenta = document.createElement('p');
  avisoCuenta.textContent =
    'Para mandárselo necesitas una cuenta: la creas en un momento y sigues la conversación por el chat.';
  avisoCuenta.style.cssText = 'font-size:.75rem;color:#94a3b8;margin-top:10px;text-align:right';

  refrescarEnvio();
  panel.append(titulo, ayuda, rejilla, nota, pie, avisoCuenta);
  fondo.appendChild(panel);
  fondo.onclick = e => { if (e.target === fondo) fondo.remove(); };
  return fondo;
};

/** Barra fija: pedir productos y reenviar el catálogo. */
const barra = (userId: string, productos: ProductoDelCatalogo[], negocio: string): HTMLElement => {
  const enlace = window.location.href;
  const contenedor = document.createElement('div');
  contenedor.style.cssText =
    'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9;display:flex;gap:8px;' +
    'background:#fff;padding:8px;border-radius:999px;box-shadow:0 4px 16px rgba(15,23,42,.18);' +
    `font-family:${FUENTE}`;

  if (productos.length) {
    contenedor.appendChild(
      boton('Me interesan', '#2563eb', () => document.body.appendChild(selector(userId, productos, negocio))),
    );
  }

  const compartir = boton('Compartir', '#22c55e', async () => {
    const texto = `Mira este catálogo:\n${enlace}`;
    // El menú nativo es lo que permite mandarlo a donde sea; en escritorio no
    // existe, y ahí WhatsApp Web es el destino más probable.
    if (navigator.share) {
      try {
        await navigator.share({ text: texto, url: enlace });
        return;
      } catch {
        /* si lo cancela, se cae al enlace de WhatsApp */
      }
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
  });

  const copiar = boton('Copiar enlace', '#334155', async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      copiar.textContent = '¡Copiado!';
      setTimeout(() => { copiar.textContent = 'Copiar enlace'; }, 2000);
    } catch {
      copiar.textContent = enlace;
    }
  });

  contenedor.append(compartir, copiar);
  return contenedor;
};

/**
 * Pinta el catálogo de un usuario.
 *
 * La instantánea vive en Storage, pero Supabase sirve el HTML público como
 * text/plain con nosniff, de modo que abrir el objeto directamente enseñaba el
 * código fuente en vez de la página —que es lo que veía quien escaneaba el QR—.
 * Así que la bajamos y la pintamos aquí, en un iframe aislado.
 */
export const mostrarCatalogo = async (userId: string): Promise<void> => {
  // El body de la app es oscuro con letra clara (ver index.html), pensado para
  // las pantallas de dentro. Esta página es de un visitante y es clara: sin
  // esto, los avisos salen en gris sobre casi negro.
  document.body.style.background = '#f1f5f9';
  document.body.style.color = '#0f172a';

  aviso('Cargando catálogo…');
  const html = await fetchCatalogHtml(userId);

  if (!html) {
    aviso('No encontramos este catálogo. Puede que su dueño aún no lo haya publicado.');
    return;
  }

  document.body.innerHTML = '';
  document.body.appendChild(barra(userId, leerProductos(html), nombreDelNegocio(html)));

  const marco = document.createElement('iframe');
  // Sin allow-same-origin: la instantánea es contenido publicado por un
  // usuario y no tiene por qué alcanzar el localStorage ni la sesión de nadie.
  // allow-popups deja funcionar el botón de «Chatear».
  marco.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
  marco.srcdoc = html;
  marco.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0';
  document.body.appendChild(marco);
};
