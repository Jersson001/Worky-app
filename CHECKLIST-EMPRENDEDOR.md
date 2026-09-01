# Checklist del emprendedor

Última revisión: 1 de septiembre de 2026.

> Este checklist pedía crear un proyecto Firebase, habilitar Realtime Database y
> una clave de Gemini. Nada de eso existe ya en el proyecto. Se reescribió para
> lo que hay: Supabase, y una app que el emprendedor solo tiene que usar.

Esto es lo que hay que dejar hecho para que la app sirva de verdad, no para
probarla. Quien monta el servidor no es el emprendedor: eso está en
[GUIA-PRODUCCION.md](GUIA-PRODUCCION.md).

---

## Tu cuenta

- [ ] Registrarte con correo y contraseña
- [ ] Completar el onboarding: nombre del negocio, tu nombre y logo
- [ ] Elegir el **tipo de negocio**

El tipo de negocio no es decorativo: decide qué capítulos de cotización ves. Un
carpintero ve Carpintería, alguien de obra ve Obra blanca, un abogado no ve
ninguno y cotiza en modo básico. La tabla está en
[ESTADO-FUNCIONALIDADES.md](ESTADO-FUNCIONALIDADES.md#a-cada-oficio-sus-capítulos).

- [ ] Firma digital guardada, si vas a mandar documentos firmados
- [ ] Al menos una cuenta bancaria propia, para poder mandar los datos de pago
      por el chat

---

## Tu catálogo

- [ ] Dos carpetas de productos, como mínimo
- [ ] Productos con foto. El nombre es obligatorio; **el precio no**: sin él sale
      «Consultar precio»
- [ ] Publicar el catálogo
- [ ] Abrir el enlace del catálogo **en una ventana privada**, sin tu sesión, y
      ver que se pinta
- [ ] Imprimir el QR o guardarlo donde lo vayas a compartir

El QR apunta a la app y es estable: puedes republicar el catálogo las veces que
quieras sin reimprimirlo.

> Si tu catálogo es de antes de agosto de 2026, **republícalo**. El botón
> «Chatear» viaja dentro de la instantánea y los publicados antes no lo tienen.

---

## Tus clientes

- [ ] Agregar un cliente que también use Worky, buscándolo por su correo o
      celular exacto
- [ ] Comprobar que **a él también le apareces**. Si no, el chat está a medias
- [ ] Crear la ficha de un cliente que no usa Worky y escribirle
- [ ] Mandar un mensaje y una foto, y ver que llegan sin recargar

No hay búsqueda por nombre ni acceso a la agenda del teléfono: hace falta el
correo o el celular exacto. Cómo funciona, en
[COMO-FUNCIONA-EL-CHAT.md](COMO-FUNCIONA-EL-CHAT.md).

---

## Tu primer trabajo cobrado

- [ ] Crear un proyecto para ese cliente
- [ ] Hacerle una cotización
- [ ] Si cotizas por capítulos: revisar que el **rendimiento** del material sea
      el tuyo. Las plantillas traen uno de partida (pintura 30 m²/galón, estuco
      8 m²/bulto…) y cambia con el producto, las manos y la superficie
- [ ] Mandársela por WhatsApp y **abrir el enlace desde otro teléfono**
- [ ] Imprimirla y comprobar que no se corta por la derecha
- [ ] Anotar un gasto del proyecto
- [ ] Mirar el reporte financiero

Los costos de las plantillas nacen **todos en cero** a propósito: te recuerdan
qué va en cada capítulo, no te sugieren precios.

---

## Antes de confiarle el negocio

- [ ] Entrar desde otro teléfono con tu cuenta y ver que están tus contactos,
      mensajes, productos y proyectos

Y saber qué **no** se sincroniza, porque se pierde al cambiar de teléfono o
borrar los datos de la app:

| | |
|---|---|
| **Grupos y sus mensajes** | Solo en ese teléfono |
| **Historias** | Solo en ese teléfono |

Y qué no existe todavía:

- **Avisos con la app cerrada.** No hay notificaciones push ni por correo: te
  enteras de un mensaje cuando abres la app.
- **Recuperar una cuenta de alias.** Quien entró solo con un alias, sin correo,
  no tiene forma de recuperarla. Por eso ve el aviso invitándole a completar el
  registro.

La lista completa está en
[ESTADO-FUNCIONALIDADES.md](ESTADO-FUNCIONALIDADES.md#lo-que-no-hay).

---

## Si algo no funciona

1. Cierra sesión y vuelve a entrar.
2. Si una foto no sube, prueba con una más pequeña.
3. Si agregaste a alguien y no le apareces, es cosa del servidor, no tuya: está
   explicado en [COMO-FUNCIONA-EL-CHAT.md](COMO-FUNCIONA-EL-CHAT.md).
4. En el navegador, la consola (F12) suele decir qué pasó.
