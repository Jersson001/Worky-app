# Compartir por WhatsApp

Última revisión: 1 de septiembre de 2026.

> Este documento decía que para mandar un documento habría que «generar el PDF y
> subirlo a Firebase Storage». Firebase ya no está, y lo que se manda no es un
> PDF: es un enlace a una página que sirve la app. Se reescribió con lo que hace
> hoy [services/whatsappService.ts](services/whatsappService.ts).

---

## Qué hace

No hay integración con la API de WhatsApp. Lo que hay es un **enlace
`api.whatsapp.com/send`** con el mensaje ya escrito: se abre WhatsApp con el
texto puesto y el usuario solo pulsa Enviar. Gratis, sin aprobación de Meta y
sin servidor.

El mensaje que se arma lleva:

- El documento resumido en texto (cotización, factura, recibo…). Si la
  cotización es por capítulos, va desglosada por capítulo y grupo, no como una
  lista plana.
- El total.
- **Enlace para ver el documento completo**, `?view=<documentId>`.
- **Enlace al catálogo**, si el vendedor tiene uno publicado.
- El enlace de la app en Google Play.

---

## Dónde vive el documento

Al compartir, `saveSharedDocument` guarda el documento en tres sitios:

| Dónde | Para qué |
|---|---|
| `localStorage` | Para que quien lo mandó pueda reabrirlo sin red |
| `shared_docs/<id>.json` en Storage | **Es el que se lee.** Lo baja la app cuando alguien abre el enlace |
| `shared_docs/<id>.html` en Storage | No lo lee nadie |

Caduca a los 30 días (`expiresAt`).

El `.html` **sobra**: se subía para abrirlo directo desde Storage, y eso no
funciona. Supabase sirve todo HTML público de Storage como `text/plain` con
`nosniff`, así que el destinatario veía el código fuente. Por eso
`generateDocumentViewLink` apunta a la app —`?view=`, una ruta que se resuelve
sin sesión— y es la app la que baja el JSON y lo pinta.

Son unos 100 KB por documento para nada. Se puede quitar junto con la Edge
Function `view-doc`, que quedó sin uso. Está anotado en
[PENDIENTE-CATALOGO-STORAGE.md](PENDIENTE-CATALOGO-STORAGE.md).

---

## Dos detalles que parecen de más y no lo son

**La pestaña se abre antes de tiempo.** Compartir un documento publica el
catálogo y sube archivos, y para cuando eso termina el navegador ya no considera
que haya un clic detrás: el bloqueador de emergentes se comía el `window.open`
sin decir nada y el botón parecía muerto. Por eso quien comparte abre la pestaña
**en el clic** y `openWhatsApp` recibe esa ventana ya abierta.

**Y esa pestaña lleva una página puente.** No basta con asignarle la dirección:
se queda en `about:blank` a la vista y hay que recargarla a mano. Así que se le
escribe una página que redirige sola y que, si no lo consigue, deja el botón
«Abrir WhatsApp» a mano. Lleva también «Volver a Worky», porque desde WhatsApp
no había forma de regresar.

Si no hay pestaña previa y el bloqueador impide abrir otra, se navega en la
misma: peor que abrir una pestaña, mejor que no hacer nada.

---

## El QR del catálogo al pie

Los documentos se maquetan con `buildDocumentHtml`, y si el vendedor tiene
catálogo publicado se les añade al pie un bloque con el **QR y el enlace**:

> Conoce todo nuestro catálogo — escanea el código o abre el enlace, no
> necesitas registrarte.

Es la parte que convierte una factura en captación: quien la recibe puede ver
todo lo que vendes sin cuenta, y solo necesita registrarse si quiere chatear.

---

## Límites

- **No envía solo.** El usuario confirma en WhatsApp. Es un enlace, no un bot.
- **No adjunta archivos.** Va el enlace, no el PDF. Un enlace además se puede
  reenviar y sigue funcionando.
- **Hace falta tener WhatsApp.** En móvil abre la app; en escritorio, WhatsApp
  Web.
- **El número tiene que estar bien.** `formatPhoneForWhatsApp` solo quita lo que
  no son dígitos: no valida ni añade indicativo de país. Un número guardado sin
  indicativo abre un chat con un número que no existe.

---

## Si algún día hiciera falta más

Mandar solo, adjuntar archivos o **recibir** respuestas dentro de Worky exige la
API de WhatsApp Business (o Twilio por encima), y eso son tres cosas que hoy no
hay: número de empresa verificado, aprobación de Meta y un servidor que atienda
los webhooks. Además se paga por mensaje pasados los primeros del mes.

No compensa hasta que el volumen lo pida. Lo que sí conviene tener claro es que
**la vía no oficial (automatizar WhatsApp Web) puede costar el número**: va
contra los términos de servicio.
