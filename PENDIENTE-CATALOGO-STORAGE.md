# Pendiente: publicar el catálogo en Storage

Estado al 25/08/2026. El catálogo público está implementado y verificado en el
navegador, pero **la subida a Storage falla** y por eso el botón «Compartir» no
funciona todavía.

## Síntoma

```
POST /storage/v1/object/files/shared_catalogs/<uid>.html  →  400
new row violates row-level security policy
```

## Lo que ya está descartado

Comprobado con datos, no por suposición:

| Hipótesis | Resultado |
|---|---|
| El id de la app no coincide con `auth.uid()` | ❌ descartada — coinciden exactamente |
| El token está expirado | ❌ descartada — válido, `rol: authenticated` |
| Faltaba la política | ❌ descartada — existe y se confirmó por `pg_policies` |
| Es la condición con `auth.uid()` | ❌ descartada — falla igual con la carpeta como única condición |
| Es el rol `authenticated` | ❌ descartada — falla igual con `to public` |

Falta capturar el **cuerpo completo** de la respuesta 400 en el último intento;
solo se vio la línea del POST, así que no está confirmado que ese último fallo
siguiera siendo de RLS.

## Hallazgo colateral importante

El bucket `files` **no tenía ninguna política de escritura** antes de esta
investigación. Las únicas existentes son de `chat_media`.

Eso implica que `saveSharedDocument` (los documentos que se mandan por WhatsApp)
**lleva fallando desde siempre**: sube dentro de un `try/catch` con `console.warn`,
así que nunca se notó. Los enlaces compartidos apuntan a archivos que nunca se
subieron. Conviene verificarlo abriendo uno de esos enlaces sin sesión.

## Solución propuesta para la próxima sesión

**Publicar en `chat_media` en vez de `files`.** Ese bucket ya tiene lo que hace
falta y está probado en producción:

- INSERT para `authenticated`
- SELECT para `public` (lectura pública, que es lo que necesita el QR)

Es un cambio de una línea en `catalogShareService.ts` y en `whatsappService.ts`
(`.from('files')` → `.from('chat_media')`), no necesita ninguna política nueva, y
de paso arregla el envío de documentos.

Contra: se pierde la separación por bucket. Aceptable frente a tener la función
caída.

Antes de aplicarlo, confirmar con una subida de prueba a `chat_media/shared_catalogs/`
desde la consola, igual que se hizo con `files`.

### Después, aparte

Investigar por qué `files` no acepta escrituras ni con una política `to public`.
Sospechas por revisar: que `storage.foldername()` no devuelva lo esperado (probar
`name like 'shared_catalogs/%'`), o alguna restricción a nivel de bucket.

## Limpieza obligatoria

Las políticas de diagnóstico deben borrarse; una permite escritura anónima:

```sql
drop policy if exists "Catalogo: prueba publica" on storage.objects;
drop policy if exists "Catalogo: prueba carpeta" on storage.objects;
```

Las de «el propio» pueden quedarse: no funcionan aún, pero no abren nada.

## Otros pendientes de la misma tanda

- **Proyectos no se guardan.** `saveProject` envía `quote_code`, `contractor_id`,
  `client_id` y `metadata`, y esas columnas no existen en la tabla. El SQL está
  dado; falta ejecutarlo. Además el error se traga con un `return`.
- **Contactos manuales** generan ids `lead_<uuid>`, que no son uuid válidos y
  chocan con `contacts.id` y `projects.contact_id`, ambos de tipo uuid.
- **Decidir** si el nombre y el precio del producto siguen siendo obligatorios.
- **10 commits sin subir.** Hacer push despliega en Vercel automáticamente.
