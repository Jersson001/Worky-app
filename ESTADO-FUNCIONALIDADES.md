# Estado de funcionalidades — Worky

Última revisión: 28 de agosto de 2026.

> Este documento describía el proyecto cuando corría sobre Firebase y decía que
> los clientes no podían tener cuenta, que Storage no estaba implementado y que
> los archivos viajaban en base64. Nada de eso sigue siendo cierto. Se reescribió
> entero comprobando cada punto contra la base de datos y la app en marcha.

---

## Cómo entra la gente

### El vendedor

Correo y contraseña. Formulario de seis campos: nombre, apellidos, correo,
país, celular y contraseña.

`Confirm email` está **desactivado** en Supabase, así que al registrarse entra
de una, sin pasar por su bandeja de correo.

### El cliente que escanea un QR — sin correo ni celular

Escribe su nombre, el servidor le ofrece **tres aliases libres**, elige uno y
aterriza directamente en el chat con el vendedor. Nada más.

```
"Lucía Torres"  →  @lucia_torres · @luciatorres · @l_torres  →  chat
```

Debajo hay una **sesión anónima de Supabase**, que es una cuenta de verdad.
Lo que no tiene es forma de recuperarse: si cambia de teléfono o borra los datos
de la app, pierde la conversación. Por eso ve un aviso —que no bloquea nada—
invitándole a completar el registro.

Quien prefiera el registro clásico tiene el enlace a mano, y si se arrepiente
puede volver al atajo sin recargar.

Piezas: `sugerir_alias()` y `reservar_alias()` en
[supabase_alias.sql](supabase_alias.sql), con sus pruebas en
[supabase_alias.test.mjs](supabase_alias.test.mjs).

### El cliente que llega por un enlace, con correo

Formulario corto: nombre, correo, celular y contraseña. Sin apellidos ni
selector de país. El vendedor que se registra por su cuenta sigue viendo el
formulario largo.

---

## Chat

Funciona en tiempo real sobre Supabase (Realtime). Texto, imágenes, archivos,
cotizaciones, facturas y productos.

**Contactos manuales.** Se puede crear la ficha de alguien que no usa Worky.
Sus mensajes van con `recipient_contact` en vez de `recipient_id`, porque esa
columna tiene clave foránea a `auth.users` y un contacto manual no existe ahí.

**Las dos fichas.** Al agregar a alguien se crean las fichas de los dos lados:
la tuya y la suya. Esto estuvo roto durante un tiempo —la versión desplegada de
`add_contact_mutual` con alias solo creaba la del que agrega, así que el otro no
se enteraba— y se corrigió en
[supabase_contactos_ficha_inversa.sql](supabase_contactos_ficha_inversa.sql).

---

## Archivos

Todo vive en el bucket `chat_media` de Supabase Storage. **Ya no se usa base64
para los adjuntos del chat.**

| Qué | Dónde |
|---|---|
| Fotos del chat | `<uid>/<contacto>/<archivo>` |
| Fotos de producto | `<uid>/<carpeta>/<archivo>` |
| Catálogos publicados | `shared_catalogs/<uid>/<fecha>.html` |
| Documentos compartidos | `shared_docs/<id>.json` y `.html` |

Las fotos se reducen antes de subirlas. Sin eso, una foto de móvil son unos
10 MB y la escritura se pasaba del tiempo máximo (error 57014 de Postgres).

El bucket `files` **está cerrado**: ya no se escribe ahí. Lo que quedó subido se
sigue leyendo.

---

## Catálogo

El vendedor arma su catálogo por carpetas y lo publica. Se genera un **HTML
autónomo** que se sube a Storage, y se comparte por QR o enlace.

Detalle importante: Supabase sirve el HTML de Storage como `text/plain` con
`nosniff`, así que abrir el objeto directamente muestra el código fuente. **La
página la sirve la app**, que baja la instantánea y la pinta. Ver
[PENDIENTE-CATALOGO-STORAGE.md](PENDIENTE-CATALOGO-STORAGE.md).

Cada publicación estrena nombre de archivo en vez de sobrescribir. El QR impreso
sigue sirviendo porque apunta a la app (`?catalogo=<uid>`), no al objeto.

Quien lo abre puede marcar productos y pulsar «Chatear». Si aún no tiene cuenta,
la selección se guarda y se le manda al vendedor en cuanto entra.

**Las URL se adaptan al sitio.** Un enlace generado desde un preview de Vercel
apunta al preview; desde el APK o en local, a la app publicada — porque ahí el
origen es `localhost` y un QR con esa dirección no llevaría a ninguna parte.

---

## Documentos

Cotizaciones, facturas, recibos de caja, cuentas de cobro y comprobantes de
gasto. Se comparten por WhatsApp como HTML maquetado, con QR del catálogo al pie.

**Impresión.** La hoja se maqueta a 850 px y al imprimir se reduce entera con
zoom, conservando la proporción. Antes se estiraba al ancho del papel y el
interior salía apretado.

---

## Lo que NO hay

- **Notificaciones push.** Ni en la app ni por correo.
- **Verificación del teléfono.** El número se guarda como texto y sirve para
  buscar, pero nadie comprueba que sea suyo. El código de SMS se retiró: no lo
  llamaba nadie y hacía creer que agregar contactos por celular costaba una
  suscripción de SMS. No cuesta nada.
- **Descripciones de producto con IA.** Se retiró: cuando fallaba escribía
  «Error al analizar la imagen» dentro del campo Descripción.
- **Recuperación de las cuentas de alias.** Sin correo no hay forma. De ahí el
  aviso.
- **Convertir una cuenta anónima en permanente de verdad.** El aviso lleva al
  editor de perfil, que guarda el correo en el perfil pero no en la cuenta de
  autenticación. Falta llamar a `updateUser` con correo y contraseña.

---

## Seguridad

Las políticas de la base se auditaron entera el 28 de agosto de 2026 y se
cerraron tres agujeros. Está todo en [SEGURIDAD.md](SEGURIDAD.md).

---

## Publicación

La versión 2.1 (`versionCode` 14) **fue rechazada** por Google Play: faltaban las
credenciales de la cuenta de demostración. Ver
[GUIA-GOOGLE-PLAY-STORE.md](GUIA-GOOGLE-PLAY-STORE.md).
