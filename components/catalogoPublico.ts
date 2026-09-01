/**
 * Página pública del catálogo: lo que ve quien escanea el QR.
 *
 * No es React a propósito: se pinta antes de montar la app, porque quien llega
 * aquí no tiene sesión y no debe toparse con el login.
 *
 * **La pinta la app, no un iframe.** La instantánea de Storage se sigue bajando
 * igual, pero aquí se lee y se dibuja a mano. Antes se metía tal cual en un
 * iframe con `sandbox` y sin `allow-scripts`, y eso la dejaba muerta: ahí dentro
 * no corre una línea de JavaScript, así que no podía haber un «me gusta» encima
 * de cada foto ni forma de que la app se enterara de nada. Se intentó con trucos
 * de CSS —`details`, `:target`— y da para navegar, no para elegir.
 *
 * Al pintarla nosotros no hace falta abrirle permisos a HTML publicado por un
 * usuario: ese HTML nunca se ejecuta, solo se lee. Y sigue funcionando con los
 * catálogos publicados antes de todo esto, porque lo que se lee es su estructura.
 */
import { fetchCatalogHtml, guardarPedidoPendiente } from '../services/catalogShareService';

interface ProductoDelCatalogo {
  nombre: string;
  precio: string;
  /** Todas sus fotos. La primera es la principal. */
  fotos: string[];
}

interface CarpetaDelCatalogo {
  nombre: string;
  portada?: string;
  productos: ProductoDelCatalogo[];
}

interface Catalogo {
  negocio: string;
  ciudad?: string;
  logo?: string;
  carpetas: CarpetaDelCatalogo[];
  /** Lo que no está en ninguna carpeta, o los catálogos planos enteros. */
  sueltos: ProductoDelCatalogo[];
}

/** Una foto marcada con «me gusta», que es lo que acaba viajando al vendedor. */
interface FotoElegida {
  imagen: string;
  /** Cómo se llama en el mensaje: «cocina m1» o «cocina m1 (foto 2)». */
  etiqueta: string;
}

const FUENTE = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

/**
 * Cuántas fotos se dejan mandar de una vez.
 *
 * El tope es del almacenamiento del navegador, no del gusto: las fotos viajan
 * como data URL en localStorage hasta que el cliente se registra, y si no caben
 * el pedido se guarda sin ellas.
 */
const MAX_ELEGIDAS = 6;

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

/** Etiqueta de una foto dentro de su producto: la 1ª lleva el nombre a secas. */
const etiquetaDe = (producto: string, i: number): string =>
  i === 0 ? producto : `${producto} (foto ${i + 1})`;

/**
 * Saca la estructura del catálogo de la instantánea publicada.
 *
 * Se lee del HTML y no de la base porque el visitante no tiene sesión y los
 * productos de otro no son suyos para consultarlos. Además así funciona con los
 * catálogos publicados antes, sin republicarlos: de esos sale una sola foto por
 * producto y ninguna carpeta, que es justo lo que tenían.
 */
const leerCatalogo = (html: string): Catalogo => {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const leerProducto = (card: Element): ProductoDelCatalogo => ({
    nombre: card.querySelector('h3')?.textContent?.trim() || 'Producto',
    precio: card.querySelector('.precio')?.textContent?.trim() || '',
    // Todas las <img> de la tarjeta: en el catálogo nuevo son la principal y sus
    // miniaturas; en los publicados antes, la única que había.
    fotos: [...card.querySelectorAll('img')].map(i => i.getAttribute('src') || '').filter(Boolean),
  });

  const carpetas: CarpetaDelCatalogo[] = [...doc.querySelectorAll('.carpeta')].map(c => ({
    nombre: c.querySelector('.pie .nombre')?.textContent?.trim() || 'Carpeta',
    portada: c.querySelector('img.portada')?.getAttribute('src') || undefined,
    productos: [...c.querySelectorAll('.card')].map(leerProducto),
  }));

  // Las tarjetas que no cuelgan de ninguna carpeta. En un catálogo plano son
  // todas; en uno con carpetas, normalmente ninguna.
  const sueltos = [...doc.querySelectorAll('.card')]
    .filter(card => !card.closest('.carpeta'))
    .map(leerProducto);

  const header = doc.querySelector('header');
  return {
    negocio: header?.querySelector('h1')?.textContent?.trim() || 'el vendedor',
    ciudad: header?.querySelector('p')?.textContent?.trim() || undefined,
    logo: header?.querySelector('img')?.getAttribute('src') || undefined,
    carpetas,
    sueltos,
  };
};

/**
 * Pinta el catálogo de un usuario.
 *
 * La instantánea vive en Storage, pero Supabase sirve el HTML público como
 * text/plain con nosniff, de modo que abrir el objeto directamente enseñaba el
 * código fuente en vez de la página —que es lo que veía quien escaneaba el QR—.
 * Así que la bajamos y la pintamos aquí.
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

  const cat = leerCatalogo(html);
  const enlace = window.location.href;

  // ── Estado ────────────────────────────────────────────────────────────────
  const meGustan: FotoElegida[] = [];
  let carpetaAbierta: CarpetaDelCatalogo | null = null;

  const gusta = (src: string) => meGustan.some(f => f.imagen === src);

  document.body.innerHTML = '';
  document.body.style.fontFamily = FUENTE;
  document.body.style.margin = '0';
  // Sitio abajo para la cinta y la barra, que van fijas y taparían el final.
  document.body.style.paddingBottom = '140px';

  // ── Cabecera ──────────────────────────────────────────────────────────────
  const cabecera = document.createElement('header');
  cabecera.style.cssText =
    'background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:24px 16px;text-align:center';
  cabecera.innerHTML =
    (cat.logo
      ? `<img src="${cat.logo}" alt="" style="width:64px;height:64px;border-radius:16px;object-fit:cover;background:#fff;margin-bottom:10px">`
      : '') +
    `<h1 style="font-size:1.4rem;font-weight:700;margin:0">${cat.negocio}</h1>` +
    (cat.ciudad ? `<p style="opacity:.85;font-size:.88rem;margin:4px 0 0">${cat.ciudad}</p>` : '');

  // ── Chatear, siempre a la vista ───────────────────────────────────────────
  const barraChat = document.createElement('div');
  barraChat.style.cssText =
    'position:sticky;top:0;z-index:15;background:rgba(241,245,249,.94);backdrop-filter:blur(8px);' +
    'padding:8px 16px;border-bottom:1px solid #e2e8f0';
  const irAlChat = boton(`💬 Chatear con ${cat.negocio}`, '#2563eb', () => {
    window.location.href = `/?vendedor=${encodeURIComponent(userId)}`;
  });
  irAlChat.style.width = '100%';
  irAlChat.style.padding = '11px 16px';
  barraChat.appendChild(irAlChat);

  const contenido = document.createElement('div');
  contenido.style.cssText = 'max-width:960px;margin:0 auto;padding:16px';

  const cinta = document.createElement('div');
  const barraInferior = document.createElement('div');

  document.body.append(cabecera, barraChat, contenido, cinta, barraInferior);

  // ── Visor de una foto, con el «me gusta» encima ───────────────────────────
  const abrirFoto = (producto: ProductoDelCatalogo, i: number) => {
    const src = producto.fotos[i];
    const etiqueta = etiquetaDe(producto.nombre, i);

    const capa = document.createElement('div');
    capa.style.cssText =
      'position:fixed;inset:0;z-index:30;background:rgba(2,6,23,.94);display:flex;' +
      'flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px';

    const foto = document.createElement('img');
    foto.src = src;
    foto.alt = etiqueta;
    foto.style.cssText =
      'max-width:100%;max-height:calc(100vh - 190px);object-fit:contain;border-radius:10px';

    const cerrar = document.createElement('button');
    cerrar.textContent = '×';
    cerrar.setAttribute('aria-label', 'Cerrar');
    cerrar.style.cssText =
      'position:absolute;top:12px;right:16px;background:transparent;border:0;color:#fff;' +
      'font-size:2.4rem;line-height:1;cursor:pointer';
    cerrar.onclick = () => capa.remove();

    const rotulo = document.createElement('p');
    rotulo.textContent = etiqueta;
    rotulo.style.cssText = 'color:#e2e8f0;font-size:.9rem;margin:0;text-align:center';

    const gustar = document.createElement('button');
    const pintarGustar = () => {
      const puesto = gusta(src);
      gustar.textContent = puesto ? '♥ Ya te gusta — quitar' : '♡ Me gusta';
      gustar.style.background = puesto ? '#e11d48' : '#2563eb';
    };
    gustar.style.cssText =
      'border:0;cursor:pointer;padding:14px 28px;border-radius:999px;font-weight:700;' +
      `font-size:1rem;color:#fff;font-family:${FUENTE}`;
    gustar.onclick = () => {
      if (gusta(src)) {
        meGustan.splice(meGustan.findIndex(f => f.imagen === src), 1);
        pintarGustar();
        pintarCinta();
        pintarContenido();
        return;
      }
      if (meGustan.length >= MAX_ELEGIDAS) {
        alert(`Puedes mandar hasta ${MAX_ELEGIDAS} fotos de una vez.`);
        return;
      }
      meGustan.push({ imagen: src, etiqueta });
      pintarCinta();
      pintarContenido();
      // Se minimiza sola: el gesto es «esta me gusta» y sigo mirando, no
      // quedarse en la foto para tener que cerrarla a mano.
      capa.remove();
    };
    pintarGustar();

    capa.append(cerrar, foto, rotulo, gustar);
    // Tocar el fondo cierra; tocar la foto o el botón, no.
    capa.onclick = e => { if (e.target === capa) capa.remove(); };
    document.body.appendChild(capa);
  };

  // ── Tarjeta de producto ───────────────────────────────────────────────────
  const tarjeta = (p: ProductoDelCatalogo): HTMLElement => {
    const art = document.createElement('article');
    art.style.cssText =
      'background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.1);' +
      'display:flex;flex-direction:column';

    if (!p.fotos.length) {
      const sin = document.createElement('div');
      sin.textContent = 'Sin foto';
      sin.style.cssText =
        'height:180px;display:flex;align-items:center;justify-content:center;background:#e2e8f0;' +
        'color:#94a3b8;font-size:.85rem';
      art.appendChild(sin);
    } else {
      /** Una foto pulsable, con su corazón si ya gusta. */
      const hueco = (src: string, i: number, alto: number, ancho?: number) => {
        const caja = document.createElement('button');
        caja.style.cssText =
          `position:relative;border:0;padding:0;cursor:pointer;background:#e2e8f0;display:block;` +
          `width:${ancho ? `${ancho}px` : '100%'};height:${alto}px;overflow:hidden;` +
          (ancho ? 'border-radius:8px;flex:none;' : '');
        caja.innerHTML =
          `<img src="${src}" alt="${p.nombre}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">`;
        if (gusta(src)) {
          const c = document.createElement('span');
          c.textContent = '♥';
          c.style.cssText =
            'position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:999px;' +
            'background:#e11d48;color:#fff;font-size:14px;line-height:24px;text-align:center';
          caja.appendChild(c);
        }
        caja.onclick = () => abrirFoto(p, i);
        return caja;
      };

      art.appendChild(hueco(p.fotos[0], 0, 180));

      if (p.fotos.length > 1) {
        const minis = document.createElement('div');
        minis.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:8px 8px 0';
        p.fotos.slice(1).forEach((src, k) => minis.appendChild(hueco(src, k + 1, 56, 56)));
        art.appendChild(minis);
      }
    }

    const cuerpo = document.createElement('div');
    cuerpo.style.cssText = 'padding:12px;display:flex;flex-direction:column;gap:6px;flex:1';
    cuerpo.innerHTML =
      `<h3 style="font-size:.95rem;font-weight:600;margin:0">${p.nombre}</h3>` +
      (p.precio
        ? `<p style="font-size:1.02rem;font-weight:700;color:#2563eb;margin:0">${p.precio}</p>`
        : '');
    art.appendChild(cuerpo);
    return art;
  };

  const rejillaDe = (productos: ProductoDelCatalogo[]): HTMLElement => {
    const g = document.createElement('div');
    g.style.cssText =
      'display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px';
    productos.forEach(p => g.appendChild(tarjeta(p)));
    return g;
  };

  // ── Contenido: fichas de carpeta, o el interior de una ────────────────────
  function pintarContenido() {
    contenido.innerHTML = '';

    // Con una sola carpeta no se pinta ninguna: una carpeta suelta que hay que
    // abrir solo esconde el catálogo y hace pensar que falta algo.
    const conCarpetas = cat.carpetas.length > 1;

    if (!conCarpetas) {
      const todos = [...cat.carpetas.flatMap(c => c.productos), ...cat.sueltos];
      contenido.appendChild(
        todos.length
          ? rejillaDe(todos)
          : Object.assign(document.createElement('p'), {
              textContent: 'Este catálogo aún no tiene productos.',
              style: 'text-align:center;color:#94a3b8;font-style:italic;padding:40px 16px',
            }),
      );
      return;
    }

    if (carpetaAbierta) {
      const volver = document.createElement('button');
      volver.style.cssText =
        'display:flex;align-items:center;gap:8px;width:100%;background:#fff;border:0;cursor:pointer;' +
        'padding:14px 16px;border-radius:14px;box-shadow:0 1px 3px rgba(15,23,42,.1);margin-bottom:14px;' +
        `font-weight:700;font-size:1rem;font-family:${FUENTE};color:#0f172a`;
      volver.innerHTML =
        `<span style="color:#2563eb;font-size:1.1rem">←</span><span style="flex:1;text-align:left">${carpetaAbierta.nombre}</span>` +
        `<span style="background:#eff6ff;color:#2563eb;border-radius:999px;padding:2px 10px;font-size:.75rem">${carpetaAbierta.productos.length}</span>`;
      volver.onclick = () => { carpetaAbierta = null; pintarContenido(); window.scrollTo(0, 0); };

      contenido.append(volver, rejillaDe(carpetaAbierta.productos));
      return;
    }

    const fichas = document.createElement('div');
    fichas.style.cssText =
      'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px';

    cat.carpetas
      .filter(c => c.productos.length)
      .forEach(c => {
        const f = document.createElement('button');
        f.style.cssText =
          'background:#fff;border:0;border-radius:14px;overflow:hidden;cursor:pointer;padding:0;' +
          'box-shadow:0 1px 3px rgba(15,23,42,.1);display:flex;flex-direction:column;text-align:left';
        f.innerHTML =
          (c.portada
            ? `<img src="${c.portada}" alt="" style="width:100%;height:110px;object-fit:cover;display:block">`
            : `<span style="height:110px;display:flex;align-items:center;justify-content:center;background:#2563eb;color:#fff;font-size:1.8rem;font-weight:700">${c.nombre.slice(0, 1).toUpperCase()}</span>`) +
          '<span style="display:flex;align-items:center;gap:8px;padding:10px 12px;font-weight:700;font-size:.95rem">' +
          `<span style="flex:1;line-height:1.25">${c.nombre}</span>` +
          `<span style="background:#eff6ff;color:#2563eb;border-radius:999px;padding:2px 10px;font-size:.75rem;flex:none">${c.productos.length}</span></span>`;
        f.onclick = () => { carpetaAbierta = c; pintarContenido(); window.scrollTo(0, 0); };
        fichas.appendChild(f);
      });

    if (cat.sueltos.length) fichas.appendChild(rejillaDe(cat.sueltos));
    contenido.appendChild(fichas);
  }

  // ── Cinta de lo que le gusta, abajo ───────────────────────────────────────
  function pintarCinta() {
    cinta.innerHTML = '';
    if (!meGustan.length) {
      cinta.style.display = 'none';
      return;
    }
    cinta.style.display = 'flex';
    cinta.style.cssText =
      'position:fixed;left:0;right:0;bottom:76px;z-index:12;display:flex;align-items:center;gap:8px;' +
      'background:#fff;padding:8px 12px;box-shadow:0 -4px 16px rgba(15,23,42,.14);' +
      `font-family:${FUENTE}`;

    const tiras = document.createElement('div');
    tiras.style.cssText = 'display:flex;gap:6px;overflow-x:auto;flex:1;align-items:center';
    meGustan.forEach(f => {
      const t = document.createElement('button');
      t.title = `Quitar ${f.etiqueta}`;
      t.style.cssText =
        'position:relative;border:0;padding:0;width:48px;height:48px;border-radius:10px;overflow:hidden;' +
        'flex:none;cursor:pointer;background:#e2e8f0';
      t.innerHTML =
        `<img src="${f.imagen}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` +
        '<span style="position:absolute;top:0;right:0;background:rgba(2,6,23,.72);color:#fff;width:17px;' +
        'height:17px;line-height:16px;font-size:12px;border-radius:0 0 0 8px">×</span>';
      t.onclick = () => {
        meGustan.splice(meGustan.findIndex(x => x.imagen === f.imagen), 1);
        pintarCinta();
        pintarContenido();
      };
      tiras.appendChild(t);
    });

    const confirmar = boton(`Confirmar ${meGustan.length}`, '#e11d48', abrirMensaje);
    confirmar.style.flex = 'none';
    cinta.append(tiras, confirmar);
  }

  // ── Ventana final: las que me gustan + el mensaje ─────────────────────────
  function abrirMensaje() {
    const fondo = document.createElement('div');
    fondo.style.cssText =
      'position:fixed;inset:0;z-index:20;background:rgba(15,23,42,.6);display:flex;align-items:flex-end;' +
      `justify-content:center;font-family:${FUENTE}`;

    const panel = document.createElement('div');
    panel.style.cssText =
      'background:#fff;color:#0f172a;width:100%;max-width:640px;max-height:88vh;' +
      'border-radius:20px 20px 0 0;color-scheme:light;display:flex;flex-direction:column';

    const cab = document.createElement('div');
    cab.style.cssText = 'padding:20px 20px 6px';
    cab.innerHTML =
      '<h2 style="font-size:1.15rem;font-weight:700;margin:0 0 4px">Imágenes que me gustan</h2>' +
      `<p style="font-size:.85rem;color:#64748b;margin:0">Cuéntale a ${cat.negocio} qué buscas y se las mandas.</p>`;

    const lista = document.createElement('div');
    lista.style.cssText = 'flex:1;overflow-y:auto;padding:12px 20px';

    const nota = document.createElement('textarea');
    nota.placeholder = 'Ej. quiero algo así pero en otro color';
    nota.rows = 3;
    nota.style.cssText =
      'width:100%;border:1px solid #e2e8f0;border-radius:12px;padding:10px;font-size:.9rem;' +
      `color:#0f172a;background:#fff;font-family:${FUENTE};resize:vertical;margin-bottom:10px`;

    const enviar = boton('Enviar', '#2563eb', () => {
      guardarPedidoPendiente({
        vendedor: userId,
        nota: nota.value.trim(),
        productos: meGustan.map(f => ({ nombre: f.etiqueta, imagen: f.imagen })),
      });
      // A la app: allí se crea la cuenta si hace falta y el pedido sale solo.
      window.location.href = `/?vendedor=${encodeURIComponent(userId)}`;
    });

    const pintarLista = () => {
      lista.innerHTML = '';
      if (!meGustan.length) {
        lista.innerHTML =
          '<p style="color:#94a3b8;font-size:.85rem;text-align:center;padding:20px 0">Ya no queda ninguna. Cierra y marca las que te gusten.</p>';
        enviar.disabled = true;
        enviar.style.opacity = '.5';
        return;
      }
      enviar.disabled = false;
      enviar.style.opacity = '1';
      enviar.textContent = `Enviar ${meGustan.length} a ${cat.negocio}`;

      const g = document.createElement('div');
      g.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px';
      meGustan.forEach(f => {
        const c = document.createElement('div');
        c.style.cssText = 'position:relative;border-radius:12px;overflow:hidden;background:#e2e8f0';
        c.innerHTML =
          `<img src="${f.imagen}" alt="" style="width:100%;height:88px;object-fit:cover;display:block">` +
          `<span style="display:block;padding:6px 8px;font-size:.72rem;font-weight:600;line-height:1.25">${f.etiqueta}</span>`;
        const quitar = document.createElement('button');
        quitar.textContent = '×';
        quitar.title = `Quitar ${f.etiqueta}`;
        quitar.style.cssText =
          'position:absolute;top:4px;right:4px;width:22px;height:22px;border:0;border-radius:999px;' +
          'background:rgba(2,6,23,.72);color:#fff;font-size:14px;line-height:22px;cursor:pointer;padding:0';
        quitar.onclick = () => {
          meGustan.splice(meGustan.findIndex(x => x.imagen === f.imagen), 1);
          pintarLista();
          pintarCinta();
          pintarContenido();
        };
        c.appendChild(quitar);
        g.appendChild(c);
      });
      lista.appendChild(g);
    };

    const pie = document.createElement('div');
    pie.style.cssText = 'border-top:1px solid #e2e8f0;padding:12px 20px 18px';
    const botones = document.createElement('div');
    botones.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
    botones.append(boton('Seguir mirando', '#94a3b8', () => fondo.remove()), enviar);

    const avisoCuenta = document.createElement('p');
    avisoCuenta.textContent =
      'Para mandárselo necesitas una cuenta: la creas en un momento y sigues la conversación por el chat.';
    avisoCuenta.style.cssText = 'font-size:.75rem;color:#94a3b8;margin-top:10px;text-align:right';

    pie.append(nota, botones, avisoCuenta);
    pintarLista();
    panel.append(cab, lista, pie);
    fondo.appendChild(panel);
    fondo.onclick = e => { if (e.target === fondo) fondo.remove(); };
    document.body.appendChild(fondo);
  }

  // ── Barra de siempre: reenviar el catálogo ────────────────────────────────
  barraInferior.style.cssText =
    'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:11;display:flex;gap:8px;' +
    'background:#fff;padding:8px;border-radius:999px;box-shadow:0 4px 16px rgba(15,23,42,.18);' +
    `font-family:${FUENTE}`;

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

  barraInferior.append(compartir, copiar);

  pintarContenido();
  pintarCinta();
};
