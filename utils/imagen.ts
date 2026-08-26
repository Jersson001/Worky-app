/**
 * Reducción de fotos antes de guardarlas.
 *
 * Las fotos que adjunta el usuario —productos del catálogo, ítems de una
 * cotización— se guardan como data URL en base64, dentro de la fila de la base
 * de datos y dentro del documento que se comparte. Una foto de móvil son 4-6 MB,
 * y en base64 crece un tercio más: tres fotos en una cotización son unos 20 MB
 * viajando en cada envío y cargándose cada vez que se abre el chat.
 *
 * Se muestran a 80 píxeles en el documento, así que 800 de lado sobra.
 */

const MAX_LADO = 800;
const CALIDAD = 0.72;

/**
 * Reescala una imagen a un lado máximo y la devuelve como JPEG.
 *
 * Si la imagen no se puede procesar (por ejemplo una URL remota, que ensucia
 * el canvas) se devuelve tal cual: no es data URL, así que no pesa igualmente.
 */
export const reducirImagen = (src: string): Promise<string> =>
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

        // Un PNG puede traer transparencia —logos, firmas— y en JPEG lo
        // transparente sale negro. Se le respeta el formato: lo que importa
        // aquí es el tamaño, y reducirlo ya quita el grueso del peso.
        const esPng = src.startsWith('data:image/png');
        resolve(esPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', CALIDAD));
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve('');
    img.src = src;
  });

/**
 * Lee un archivo y lo devuelve ya reducido, listo para guardar.
 *
 * Es lo que hay que usar al adjuntar: leer con FileReader a secas mete la foto
 * entera, a tamaño original, en la base de datos.
 */
export const leerImagenReducida = (file: File): Promise<string> =>
  new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = async () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      resolve(src ? await reducirImagen(src) : '');
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
