import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { fetchCatalogHtml } from './services/catalogShareService';

// Manejo de errores global
window.addEventListener('error', (event) => {
  console.error('Error global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rechazada:', event.reason);
});

/**
 * Página pública del catálogo: `?catalogo=<userId>`.
 *
 * La instantánea vive en Storage, pero Supabase sirve el HTML público como
 * text/plain con nosniff, de modo que abrir el objeto directamente enseñaba el
 * código fuente en vez de la página —que es lo que veía quien escaneaba el QR—.
 * Así que la bajamos y la pintamos aquí, en un iframe aislado.
 *
 * Se resuelve antes de montar la app: el visitante no tiene sesión y no debe
 * toparse con el login.
 */
/**
 * Barra para reenviar el catálogo.
 *
 * Vive en la página y no dentro del iframe a propósito: la instantánea se pinta
 * con `sandbox` y sin `allow-scripts`, y no merece la pena abrirle permisos a
 * contenido publicado por un usuario solo para poner un botón. Como además es
 * la app quien la dibuja, los catálogos ya publicados la tienen sin republicar.
 */
const barraCompartir = (): HTMLElement => {
  const enlace = window.location.href;
  const barra = document.createElement('div');
  barra.style.cssText =
    'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9;display:flex;gap:8px;' +
    'background:#fff;padding:8px;border-radius:999px;box-shadow:0 4px 16px rgba(15,23,42,.18);' +
    "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

  const boton = (texto: string, fondo: string, alPulsar: () => void) => {
    const b = document.createElement('button');
    b.textContent = texto;
    b.style.cssText =
      `border:0;cursor:pointer;padding:10px 18px;border-radius:999px;font-weight:700;font-size:.85rem;background:${fondo};color:#fff`;
    b.onclick = alPulsar;
    return b;
  };

  const porWhatsApp = boton('Compartir', '#22c55e', async () => {
    const texto = `Mira este catálogo:
${enlace}`;
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

  barra.append(porWhatsApp, copiar);
  return barra;
};

const mostrarCatalogo = async (userId: string) => {
  const aviso = (texto: string) => {
    document.body.innerHTML =
      `<p style="font-family:system-ui,sans-serif;color:#64748b;text-align:center;padding:48px 24px">${texto}</p>`;
  };

  aviso('Cargando catálogo…');
  const html = await fetchCatalogHtml(userId);

  if (!html) {
    aviso('No encontramos este catálogo. Puede que su dueño aún no lo haya publicado.');
    return;
  }

  document.body.innerHTML = '';
  document.body.appendChild(barraCompartir());

  const marco = document.createElement('iframe');
  // Sin allow-same-origin: la instantánea es contenido publicado por un
  // usuario y no tiene por qué alcanzar el localStorage ni la sesión de nadie.
  // allow-popups deja funcionar el botón de «Chatear».
  marco.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox');
  marco.srcdoc = html;
  marco.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0';
  document.body.appendChild(marco);
};

const catalogoId = new URLSearchParams(window.location.search).get('catalogo');
if (catalogoId) {
  mostrarCatalogo(catalogoId);
}

const rootElement = document.getElementById('root');
if (catalogoId) {
  // Ya se está pintando el catálogo; la app no se monta.
} else if (!rootElement) {
  console.error("Could not find root element to mount to");
  // Crear el elemento si no existe
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
  const root = ReactDOM.createRoot(newRoot);
  root.render(<ErrorBoundary><App /></ErrorBoundary>);
} else {
  const root = ReactDOM.createRoot(rootElement);
  // Desactivar StrictMode temporalmente para evitar problemas en Android
  // ErrorBoundary: si algo revienta en render, muestra pantalla de
  // recuperación en vez de dejar todo en negro.
  root.render(<ErrorBoundary><App /></ErrorBoundary>);
}