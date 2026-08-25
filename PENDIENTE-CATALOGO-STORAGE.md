# Pendiente: publicar el catálogo en Storage

Estado al 25/08/2026, segunda sesión. **El código ya está cambiado**; falta
ejecutar un SQL y probarlo con sesión iniciada.

## Qué se hizo

Se aplicó la solución que quedó propuesta: publicar en `chat_media` en vez de
`files`. El bucket se centraliza ahora en `PUBLIC_BUCKET` (`services/supabaseConfig.ts`),
y lo usan `catalogShareService.ts` (catálogo) y `whatsappService.ts` (documentos
compartidos). También se actualizó la función `view-doc`, que leía de `files`.

Confirmado leyendo `supabase_chat_media_storage.sql`, que es lo que se ejecutó
en su día: `chat_media` tiene lectura pública para todo el bucket e INSERT para
`authenticated`, sin ninguna condición sobre la carpeta. Es decir, subir a
`shared_catalogs/` está permitido. Comprobado además que los dos buckets
responden `NoSuchKey` a una lectura anónima, o sea que `files` existe y la
lectura pública funciona en ambos.

## Lo que falta

1. **Ejecutar `supabase_catalogo_storage.sql`** en el Editor SQL. Añade la
   política de UPDATE que falta: el catálogo sube con `upsert` sobre una ruta
   fija por usuario, así que la primera publicación es un INSERT (permitido) y
   las siguientes un UPDATE (hoy sin política, fallaría igual que antes).
   El mismo script borra las políticas de diagnóstico, una de las cuales
   permite escritura anónima en `files`.
2. **Probar el botón «Compartir» con sesión iniciada**, y republicar una
   segunda vez para verificar el upsert.
3. **Abrir la URL del catálogo sin sesión** (ventana privada) para confirmar la
   lectura pública, que es lo que hará quien escanee el QR.

## Lo que ya está descartado

Comprobado con datos, no por suposición. Todo esto es sobre el bucket `files`,
que ya no se usa para compartir:

| Hipótesis | Resultado |
|---|---|
| El id de la app no coincide con `auth.uid()` | ❌ descartada — coinciden exactamente |
| El token está expirado | ❌ descartada — válido, `rol: authenticated` |
| Faltaba la política | ❌ descartada — existe y se confirmó por `pg_policies` |
| Es la condición con `auth.uid()` | ❌ descartada — falla igual con la carpeta como única condición |
| Es el rol `authenticated` | ❌ descartada — falla igual con `to public` |

## Efecto colateral: documentos por WhatsApp

`saveSharedDocument` subía a `files` dentro de un `try/catch` con `console.warn`,
así que **llevaba fallando desde siempre sin que se notara**: los enlaces
compartidos apuntaban a archivos que nunca se subieron. Al cambiar de bucket
debería quedar arreglado, pero conviene comprobarlo mandando un documento y
abriendo el enlace sin sesión.

`storageService.uploadFile` y `getFileDownloadURL` siguen apuntando a `files`.
No se tocaron porque nadie los llama (el chat usa `uploadFileForChat`, que ya va
a `chat_media`). Si se reactivan, hay que cambiarles el bucket.

`supabase/functions/view-doc/index.ts` ya lee de `chat_media`, pero es una Edge
Function: el cambio no surte efecto hasta redesplegarla.

## Sigue abierto, aparte

Por qué `files` no acepta escrituras ni con una política `to public`. La
sospecha nueva es una política **RESTRICTIVE** sobre `storage.objects`: eso
explicaría que ninguna política permisiva añadida cambie nada. La consulta del
final de `supabase_catalogo_storage.sql` muestra la columna `permissive` de
todas las políticas del bucket. Otras sospechas anteriores: que
`storage.foldername()` no devuelva lo esperado, o alguna restricción de bucket.

## Otros pendientes de la misma tanda

- **Proyectos no se guardan.** `saveProject` envía `quote_code`, `contractor_id`,
  `client_id` y `metadata`, y esas columnas no existen en la tabla. El SQL está
  dado; falta ejecutarlo. Además el error se traga con un `return`.
- **Contactos manuales** generan ids `lead_<uuid>`, que no son uuid válidos y
  chocan con `contacts.id` y `projects.contact_id`, ambos de tipo uuid.
- **Decidir** si el nombre y el precio del producto siguen siendo obligatorios.
- **11 commits sin subir.** Hacer push despliega en Vercel automáticamente.
