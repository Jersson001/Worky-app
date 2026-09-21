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
import { guardarTienda, leerTiendas, quitarTienda } from '../utils/tiendasGuardadas';

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
  /** Local, centro comercial y dirección, ya juntos. Para quien quiere ir. */
  ubicacion?: string;
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

/**
 * El precio de una tarjeta, o vacío si no lo tiene.
 *
 * El HTML publicado escribe «Consultar precio» cuando no hay precio, y eso
 * salía pintado como si fuera uno: la gente preguntaba por qué no se podía
 * tocar. Es un letrero, no un dato, así que aquí se lee como «no hay precio» y
 * la tarjeta ofrece preguntarlo. Se reconoce por la clase, y por el texto para
 * los catálogos publicados antes de que la llevara.
 */
const precioDe = (card: Element): string => {
  const p = card.querySelector('.precio');
  if (!p || p.classList.contains('sin-precio')) return '';
  const texto = p.textContent?.trim() || '';
  return /^consultar precio$/i.test(texto) ? '' : texto;
};

/**
 * La portada de una carpeta que no tiene foto.
 *
 * Antes era un cuadro de color con la inicial, que no dice nada: dos carpetas
 * que empiezan igual se ven iguales. Ahora se pinta el nombre entero como una
 * portada de verdad, con una serif —la que trae el teléfono, sin pedirle nada a
 * ningún servidor— sobre un fondo oscuro con una raya fina encima.
 *
 * El nombre se corta a tres renglones: en 150 px de ancho, más que eso ya no se
 * lee, y el nombre completo está justo debajo, en el pie de la ficha.
 */
const SERIF = "Georgia,'Noto Serif','Times New Roman',serif";

const portadaDeNombre = (nombre: string, alto = 110): string =>
  `<span style="height:${alto}px;display:flex;flex-direction:column;align-items:center;` +
  `justify-content:center;gap:7px;padding:10px 12px;box-sizing:border-box;` +
  `background:linear-gradient(135deg,#1e293b,#334155);color:#fff;text-align:center">` +
  '<span style="width:26px;height:2px;background:rgba(255,255,255,.55);flex:none"></span>' +
  `<span style="font-family:${SERIF};font-size:.98rem;font-weight:600;line-height:1.25;` +
  `letter-spacing:.01em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;` +
  `overflow:hidden">${nombre}</span></span>`;

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
    precio: precioDe(card),
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
  // Los catálogos publicados antes de la ubicación traen un solo `<p>`, el de la
  // ciudad, y sin clase: por eso el respaldo es el primero que haya.
  const texto = (sel: string) => header?.querySelector(sel)?.textContent?.trim() || undefined;
  return {
    negocio: header?.querySelector('h1')?.textContent?.trim() || 'el vendedor',
    ubicacion: texto('p.ubicacion'),
    ciudad: texto('p.ciudad') ?? texto('p:not(.ubicacion)'),
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
    (cat.ubicacion
      ? `<p style="font-size:.9rem;font-weight:600;margin:6px 0 0">📍 ${cat.ubicacion}</p>`
      : '') +
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

  // Entrada a las tiendas guardadas. Solo aparece si hay alguna: en la primera
  // visita no hay nada que abrir y sería un botón que no hace nada.
  const chipTiendas = document.createElement('button');
  chipTiendas.style.cssText =
    'border:0;background:none;cursor:pointer;padding:6px 2px 0;width:100%;text-align:center;' +
    `color:#475569;font-size:.78rem;font-weight:700;font-family:${FUENTE}`;
  chipTiendas.onclick = () => abrirTiendasGuardadas();

  const pintarChip = () => {
    const n = leerTiendas().length;
    chipTiendas.style.display = n ? 'block' : 'none';
    chipTiendas.textContent = `🔖 Mis tiendas guardadas (${n})`;
  };

  barraChat.append(irAlChat, chipTiendas);

  const contenido = document.createElement('div');
  contenido.style.cssText = 'max-width:960px;margin:0 auto;padding:16px';

  const cinta = document.createElement('div');
  const barraInferior = document.createElement('div');

  document.body.append(cabecera, barraChat, contenido, cinta, barraInferior);

  // ── Visor de una foto, con el «me gusta» encima ───────────────────────────
  //
  // Se abre sobre una foto concreta pero se queda con el producto entero: desde
  // dentro se pasa a la siguiente y a la anterior sin volver a la rejilla, que
  // es como se mira un producto con cuatro fotos —frente, espalda, detalle—.
  const abrirFoto = (producto: ProductoDelCatalogo, desde: number) => {
    let i = desde;

    const capa = document.createElement('div');
    capa.style.cssText =
      'position:fixed;inset:0;z-index:30;background:rgba(2,6,23,.94);display:flex;' +
      'flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px';

    const foto = document.createElement('img');
    foto.style.cssText =
      'max-width:100%;max-height:calc(100vh - 230px);object-fit:contain;border-radius:10px';

    const cerrar = document.createElement('button');
    cerrar.textContent = '×';
    cerrar.setAttribute('aria-label', 'Cerrar');
    cerrar.style.cssText =
      'position:absolute;top:12px;right:16px;background:transparent;border:0;color:#fff;' +
      'font-size:2.4rem;line-height:1;cursor:pointer';

    const rotulo = document.createElement('p');
    rotulo.style.cssText = 'color:#e2e8f0;font-size:.9rem;margin:0;text-align:center';

    // El precio también aquí: quien amplía una foto para mirarla de cerca es
    // justo quien está decidiendo, y hasta ahora tenía que cerrar para verlo.
    const precio = document.createElement('p');
    precio.style.cssText =
      'color:#fff;font-size:1.15rem;font-weight:800;margin:0;text-align:center';

    const gustar = document.createElement('button');
    gustar.style.cssText =
      'border:0;cursor:pointer;padding:14px 28px;border-radius:999px;font-weight:700;' +
      `font-size:1rem;color:#fff;font-family:${FUENTE}`;

    /** Las flechas van fijas a los lados, fuera del camino de la foto. */
    const flecha = (texto: string, lado: 'left' | 'right', alPulsar: () => void) => {
      const b = document.createElement('button');
      b.textContent = texto;
      b.setAttribute('aria-label', lado === 'left' ? 'Foto anterior' : 'Foto siguiente');
      b.style.cssText =
        `position:absolute;${lado}:10px;top:50%;transform:translateY(-50%);width:44px;height:44px;` +
        'border:0;border-radius:999px;background:rgba(15,23,42,.65);color:#fff;font-size:1.6rem;' +
        'line-height:44px;cursor:pointer;padding:0';
      b.onclick = alPulsar;
      return b;
    };

    const mostrar = (n: number) => {
      // Da la vuelta en los extremos: con cuatro fotos, seguir tocando
      // «siguiente» al llegar al final no debe dejar la flecha muerta.
      i = (n + producto.fotos.length) % producto.fotos.length;
      const src = producto.fotos[i];
      const etiqueta = etiquetaDe(producto.nombre, i);
      foto.src = src;
      foto.alt = etiqueta;
      rotulo.textContent = producto.fotos.length > 1
        ? `${etiqueta} · ${i + 1} de ${producto.fotos.length}`
        : etiqueta;
      precio.textContent = producto.precio;
      precio.style.display = producto.precio ? 'block' : 'none';
      const puesto = gusta(src);
      gustar.textContent = puesto ? '♥ Ya te gusta — quitar' : '♡ Me gusta';
      gustar.style.background = puesto ? '#e11d48' : '#2563eb';
    };

    function cerrarVisor() {
      document.removeEventListener('keydown', porTeclado);
      capa.remove();
    }

    const porTeclado = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') mostrar(i + 1);
      else if (e.key === 'ArrowLeft') mostrar(i - 1);
      else if (e.key === 'Escape') cerrarVisor();
    };

    gustar.onclick = () => {
      const src = producto.fotos[i];
      if (gusta(src)) {
        meGustan.splice(meGustan.findIndex(x => x.imagen === src), 1);
        mostrar(i);
        pintarCinta();
        pintarContenido();
        return;
      }
      if (meGustan.length >= MAX_ELEGIDAS) {
        alert(`Puedes mandar hasta ${MAX_ELEGIDAS} fotos de una vez.`);
        return;
      }
      meGustan.push({ imagen: src, etiqueta: etiquetaDe(producto.nombre, i) });
      pintarCinta();
      pintarContenido();
      // Se minimiza sola: el gesto es «esta me gusta» y sigo mirando, no
      // quedarse en la foto para tener que cerrarla a mano.
      cerrarVisor();
    };

    cerrar.onclick = cerrarVisor;
    capa.append(cerrar, foto, rotulo, precio, gustar);
    if (producto.fotos.length > 1) {
      capa.append(
        flecha('‹', 'left', () => mostrar(i - 1)),
        flecha('›', 'right', () => mostrar(i + 1)),
      );
    }
    mostrar(i);
    // Tocar el fondo cierra; tocar la foto, las flechas o el botón, no.
    capa.onclick = e => { if (e.target === capa) cerrarVisor(); };
    document.addEventListener('keydown', porTeclado);
    document.body.appendChild(capa);
  };

  /**
   * «Pregunta el precio»: marca la foto del producto y abre el mensaje con la
   * pregunta ya escrita.
   *
   * Lo que había era el letrero «Consultar precio», que la gente intentaba
   * tocar y no hacía nada. Preguntar un precio es exactamente para lo que está
   * el chat con el vendedor, y la foto va con la pregunta para que sepa de cuál
   * de sus productos le hablan.
   */
  function preguntarPrecio(p: ProductoDelCatalogo) {
    const src = p.fotos[0];
    if (src && !gusta(src)) {
      if (meGustan.length >= MAX_ELEGIDAS) {
        alert(`Puedes mandar hasta ${MAX_ELEGIDAS} fotos de una vez.`);
      } else {
        meGustan.push({ imagen: src, etiqueta: etiquetaDe(p.nombre, 0) });
        pintarCinta();
        pintarContenido();
      }
    }
    abrirMensaje(`Hola, ¿cuánto vale ${p.nombre}?`);
  }

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
        // El precio va encima de la foto, también en las miniaturas: en una
        // carpeta con varios modelos es lo que se compara de un vistazo, y
        // tenerlo solo al pie de la tarjeta obliga a entrar en cada una.
        if (p.precio) {
          const etiquetaPrecio = document.createElement('span');
          etiquetaPrecio.textContent = p.precio;
          const chico = alto <= 70;
          etiquetaPrecio.style.cssText =
            `position:absolute;left:0;right:0;bottom:0;background:rgba(2,6,23,.66);color:#fff;` +
            `font-weight:700;text-align:center;padding:${chico ? '1px 2px' : '3px 6px'};` +
            `font-size:${chico ? '.56rem' : '.82rem'};white-space:nowrap;overflow:hidden;` +
            'text-overflow:ellipsis';
          caja.appendChild(etiquetaPrecio);
        }
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
    cuerpo.style.cssText = 'padding:12px;display:flex;flex-direction:column;gap:8px;flex:1';
    cuerpo.innerHTML = `<h3 style="font-size:.95rem;font-weight:600;margin:0">${p.nombre}</h3>`;

    if (p.precio) {
      cuerpo.innerHTML +=
        `<p style="font-size:1.02rem;font-weight:700;color:#2563eb;margin:0">${p.precio}</p>`;
    } else {
      const preguntar = boton('Pregunta el precio', '#2563eb', () => preguntarPrecio(p));
      preguntar.style.cssText += ';width:100%;padding:9px 12px;margin-top:auto';
      cuerpo.appendChild(preguntar);
    }
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
            : portadaDeNombre(c.nombre)) +
          '<span style="display:flex;align-items:center;gap:8px;padding:10px 12px;font-weight:700;font-size:.95rem">' +
          // Con el nombre ya en la portada, repetirlo debajo es decir dos veces
          // lo mismo en la misma ficha: ahí va lo que falta, cuántos hay.
          `<span style="flex:1;line-height:1.25">${c.portada ? c.nombre : `${c.productos.length} producto${c.productos.length === 1 ? '' : 's'}`}</span>` +
          // La burbuja con el número sobra si el pie ya dice «3 productos».
          (c.portada
            ? `<span style="background:#eff6ff;color:#2563eb;border-radius:999px;padding:2px 10px;font-size:.75rem;flex:none">${c.productos.length}</span>`
            : '') +
          '</span>';
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
  //
  // El texto puede venir escrito: «Pregunta el precio» abre esta misma ventana
  // con la pregunta puesta, para que no tenga que redactarla quien solo quiere
  // saber cuánto vale.
  function abrirMensaje(textoInicial = '') {
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
    nota.value = textoInicial;
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

  const estaGuardada = () => leerTiendas().some(t => t.id === userId);

  const guardar = boton('', '#f59e0b', () => {
    const ya = estaGuardada();
    const hecho = ya
      ? quitarTienda(userId)
      : guardarTienda({
          id: userId,
          negocio: cat.negocio,
          ubicacion: cat.ubicacion,
          ciudad: cat.ciudad,
          logo: cat.logo,
          enlace,
          guardadaEn: new Date().toISOString(),
        });

    if (!hecho) {
      alert('Tu navegador no deja guardar en este teléfono. Prueba fuera del modo incógnito.');
      return;
    }
    pintarGuardar();
    pintarChip();
    if (!ya) invitarARegistrarse();
  });

  const pintarGuardar = () => {
    const g = estaGuardada();
    guardar.textContent = g ? '🔖 Guardada' : '🔖 Guardar';
    guardar.style.background = g ? '#0f766e' : '#f59e0b';
    guardar.title = g ? 'Quitar de mis tiendas' : 'Guardar esta tienda para volver';
  };

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

  barraInferior.append(guardar, compartir, copiar);
  pintarGuardar();
  pintarChip();

  /** Capa oscura con una tarjeta blanca, como el panel de «me gustan». */
  function capaConPanel(): { fondo: HTMLDivElement; panel: HTMLDivElement } {
    const fondo = document.createElement('div');
    fondo.style.cssText =
      'position:fixed;inset:0;z-index:40;background:rgba(2,6,23,.55);display:flex;' +
      'align-items:flex-end;justify-content:center;padding:0';
    const panel = document.createElement('div');
    panel.style.cssText =
      `background:#fff;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:20px 18px 24px;` +
      `font-family:${FUENTE};max-height:80vh;overflow-y:auto`;
    fondo.appendChild(panel);
    fondo.onclick = e => { if (e.target === fondo) fondo.remove(); };
    document.body.appendChild(fondo);
    return { fondo, panel };
  }

  /**
   * Al guardar por primera vez, ofrecerle cuenta.
   *
   * La tienda ya quedó guardada: esto no es un peaje, es avisarle de que se
   * guardó solo en este teléfono y que con una cuenta no la pierde. Por eso
   * «Ahora no» es una salida de verdad y no hay nada bloqueado detrás.
   */
  function invitarARegistrarse(): void {
    const { fondo, panel } = capaConPanel();
    panel.innerHTML =
      `<p style="font-weight:800;font-size:1.05rem;margin:0 0 6px">Guardaste a ${cat.negocio}</p>` +
      '<p style="color:#475569;font-size:.9rem;margin:0 0 4px">Quedó guardada <b>en este teléfono</b>.' +
      ' Si lo cambias o borras los datos del navegador, la pierdes.</p>' +
      '<p style="color:#475569;font-size:.9rem;margin:0 0 16px">Con una cuenta de Worky la tienes' +
      ' siempre a mano y puedes escribirle por el chat.</p>';

    const acciones = document.createElement('div');
    acciones.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap';
    const ahoraNo = boton('Ahora no', '#94a3b8', () => fondo.remove());
    // Con `registro=1` la app abre el formulario de correo, celular y nombre.
    // El atajo del alias no sirve aquí: lo que se le ofrece es precisamente
    // una cuenta que no se pierda al cambiar de teléfono, y un alias sin
    // correo no se puede recuperar.
    const crearCuenta = boton('Crear mi cuenta', '#2563eb', () => {
      window.location.href = `/?vendedor=${encodeURIComponent(userId)}&registro=1`;
    });
    acciones.append(ahoraNo, crearCuenta);
    panel.appendChild(acciones);
  }

  /** La lista de lo guardado: para volver a una tienda que se vio hace días. */
  function abrirTiendasGuardadas(): void {
    const { fondo, panel } = capaConPanel();
    const cab = document.createElement('p');
    cab.textContent = 'Mis tiendas guardadas';
    cab.style.cssText = 'font-weight:800;font-size:1.05rem;margin:0 0 4px';
    const nota = document.createElement('p');
    nota.textContent = 'Guardadas en este teléfono.';
    nota.style.cssText = 'color:#94a3b8;font-size:.78rem;margin:0 0 14px';
    const lista = document.createElement('div');
    lista.style.cssText = 'display:flex;flex-direction:column;gap:8px';

    const pintar = () => {
      const tiendas = leerTiendas();
      lista.innerHTML = '';
      if (!tiendas.length) {
        lista.innerHTML = '<p style="color:#94a3b8;font-style:italic;text-align:center;padding:20px 0">' +
          'Todavía no has guardado ninguna tienda.</p>';
        return;
      }
      for (const t of tiendas) {
        const fila = document.createElement('div');
        fila.style.cssText =
          'display:flex;align-items:center;gap:10px;border:1px solid #e2e8f0;border-radius:14px;padding:10px';
        fila.innerHTML =
          (t.logo
            ? `<img src="${t.logo}" alt="" style="width:40px;height:40px;border-radius:10px;object-fit:cover;flex:0 0 auto">`
            : '<div style="width:40px;height:40px;border-radius:10px;background:#e2e8f0;flex:0 0 auto"></div>') +
          `<div style="flex:1;min-width:0">
             <div style="font-weight:700;font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.negocio}</div>
             <div style="color:#64748b;font-size:.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${[t.ubicacion, t.ciudad].filter(Boolean).join(' · ')}</div>
           </div>`;
        const abrir = boton('Abrir', '#2563eb', () => { window.location.href = t.enlace; });
        abrir.style.padding = '7px 14px';
        const quitar = boton('Quitar', '#e2e8f0', () => {
          quitarTienda(t.id);
          pintar();
          pintarGuardar();
          pintarChip();
        });
        quitar.style.padding = '7px 12px';
        quitar.style.color = '#475569';
        fila.append(abrir, quitar);
        lista.appendChild(fila);
      }
    };

    pintar();
    panel.append(cab, nota, lista);
  }

  pintarContenido();
  pintarCinta();
};
