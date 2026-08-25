# Catálogo en Storage — estado

Actualizado el 25/08/2026. **La subida ya funciona.** Queda desplegar y probar
el QR de punta a punta.

## Resuelto: la subida

El bucket `files` no tiene ninguna política de escritura en `storage.objects`,
así que toda subida devolvía "new row violates row-level security policy". Se
cambió a `chat_media`, que ya tenía lectura pública e INSERT para
`authenticated` sin condición de carpeta, y se añadió la política de UPDATE que
faltaba (`supabase_catalogo_storage.sql`), necesaria porque el catálogo sube con
`upsert` sobre una ruta fija por usuario.

Comprobado listando el bucket sin sesión: hay catálogos publicados en
`shared_catalogs/`, de ~106 KB y `mimetype: text/html`.

## Resuelto: el QR llevaba al código fuente

Síntoma: escanear el QR mostraba "un código larguísimo" que no llevaba a
ninguna parte. La causa, vista en las cabeceras de la respuesta:

```
Content-Type: text/plain
X-Content-Type-Options: nosniff
```

Supabase sirve **todo HTML público de Storage como texto plano** —para que nadie
aloje páginas en su dominio— y con `nosniff` el navegador no puede ignorarlo. El
archivo llega entero; sencillamente Storage nunca lo va a pintar como página.

Solución: la instantánea se sigue guardando en Storage, pero la sirve la app.
Ruta pública `?catalogo=<userId>`, resuelta en `index.tsx` **antes** de montar la
app —el visitante no tiene sesión y no debe toparse con el login—: baja el HTML
y lo pinta en un iframe con `sandbox` sin `allow-same-origin`.

El enlace del QR es ahora `https://worky-app-khaki.vercel.app/?catalogo=<userId>`,
más corto que la URL de Storage y estable por usuario, así que el QR impreso
sigue sirviendo tras republicar.

Verificado en local con un catálogo real ya publicado: se pinta el negocio, la
ciudad, la tarjeta del producto con su precio y el botón de chatear; y con un id
inexistente sale el aviso de "no encontramos este catálogo".

Los documentos que se mandan por WhatsApp tenían el mismo problema —el
destinatario habría visto el código fuente—, así que `generateDocumentViewLink`
apunta también a la app (`?view=`), que ya era una ruta pública y lee el JSON.

## Lo que falta

1. **Desplegar.** Hasta que el push llegue a Vercel, el enlace del QR apunta a
   una ruta que en producción todavía no existe.
2. **Publicar el catálogo dos veces** desde la app: la segunda es la que prueba
   el `upsert`, es decir la política de UPDATE.
3. **Abrir el enlace sin sesión**, en ventana privada o desde el móvil.
4. **Mandar un documento por WhatsApp** y abrir su enlace, que es el arreglo que
   va de propina y nadie ha probado.

## Sigue abierto, aparte

Por qué `files` no acepta escrituras ni con una política `to public`. La
sospecha nueva es una política **RESTRICTIVE** sobre `storage.objects`, que
explicaría que ninguna política permisiva cambie nada; la consulta del final de
`supabase_catalogo_storage.sql` muestra la columna `permissive`. Ya no bloquea
nada: nada de lo que se comparte usa ese bucket.

`storageService.uploadFile` y `getFileDownloadURL` siguen apuntando a `files`.
No se tocaron porque nadie los llama (el chat usa `uploadFileForChat`, que va a
`chat_media`). Si se reactivan, hay que cambiarles el bucket.

`saveSharedDocument` sigue subiendo el `.html` del documento además del JSON,
que ya no lee nadie: son ~100 KB por documento para nada. Se puede quitar junto
con la Edge Function `view-doc`, que quedó sin uso.

## Otros pendientes de la misma tanda

- **Proyectos no se guardan.** `saveProject` envía `quote_code`, `contractor_id`,
  `client_id` y `metadata`, y esas columnas no existen en la tabla. El SQL está
  dado; falta ejecutarlo. Además el error se traga con un `return`.
- **Contactos manuales** generan ids `lead_<uuid>`, que no son uuid válidos y
  chocan con `contacts.id` y `projects.contact_id`, ambos de tipo uuid.
- **Decidir** si el nombre y el precio del producto siguen siendo obligatorios.
