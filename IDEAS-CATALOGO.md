# Ideas pendientes — catálogo y captación de clientes

Apuntadas el 25/08/2026, **sin empezar**. El norte de todas: lo que el usuario
de Worky necesita es *vender*, así que el catálogo no es un folleto, es la
puerta de entrada de un cliente nuevo.

## 1. Que el catálogo se pueda reenviar

Hoy el enlace es público y cualquiera puede abrirlo, pero quien lo recibe no
tiene forma cómoda de pasárselo a otro. La idea: que desde la propia página del
catálogo se pueda compartir —WhatsApp, copiar enlace, el QR otra vez— para que
circule solo, sin que el vendedor tenga que reenviarlo cada vez.

## 2. Del QR al chat, sin pasos intermedios

Cuando el cliente escanea el QR y se registra, que **entre directo al chat con
quien le mandó el QR**, y que vea su nombre. Hoy se registra y aterriza en la
app sin saber con quién hablaba.

La URL del catálogo ya lleva el `userId` del vendedor (`?catalogo=<userId>`), así
que la atribución ya viaja en el enlace: falta arrastrarla por el registro y
crear el contacto y la conversación al terminar.

## 3. Que el cliente pueda responder con las imágenes del catálogo

Que quien recibe el catálogo pueda **escoger imágenes de productos, ponerles una
nota y enviárselas** al vendedor. Es la forma natural de decir "quiero este y
este, pero en azul".

> Este punto quedó a medio explicar y conviene confirmarlo antes de diseñarlo:
> entendí *seleccionar varias imágenes del catálogo + añadir una nota + mandarlas
> al chat del vendedor*. Si era otra cosa, corregir aquí antes de empezar.

## Por dónde empezar

El punto 2 es el que más mueve la aguja —convierte un QR escaneado en una
conversación— y además reaprovecha lo que ya está: el `userId` viaja en el
enlace y la ruta pública ya existe. El 1 es pequeño. El 3 es el más grande, y
depende de que el 2 esté hecho, porque sin chat con el vendedor no hay a dónde
mandar nada.
