# Ideas pendientes — catálogo y captación de clientes

Apuntadas el 25/08/2026, **sin empezar**. El norte de todas: lo que el usuario
de Worky necesita es *vender*, así que el catálogo no es un folleto, es la
puerta de entrada de un cliente nuevo.

## 1. Que el catálogo se pueda reenviar — HECHO

La página del catálogo lleva una barra con «Compartir» y «Copiar enlace».
«Compartir» usa el menú nativo del móvil, que es lo que permite mandarlo a
donde sea; en escritorio, donde ese menú no existe, cae a WhatsApp Web.

La barra la dibuja la app, no la instantánea, así que **los catálogos ya
publicados la tienen sin republicar**. Está fuera del iframe a propósito: la
instantánea se pinta con `sandbox` y sin `allow-scripts`, y no compensa abrirle
permisos a contenido publicado por un usuario solo para poner un botón.

## 2. Del QR al chat, sin pasos intermedios — HECHO

El botón «Chatear» del catálogo ahora entra a la app como `?vendedor=<userId>`.
La app se guarda ese id y limpia la URL, porque entre que llega y termina de
registrarse hay formulario, confirmación por correo y onboarding, y la URL no
sobrevive ese viaje.

Mientras se registra, la pantalla de acceso le dice con quién va a hablar:
*«Crea tu cuenta y hablas directo con <negocio>»*, con su foto. Al entrar, se
crea el contacto por los dos lados —vía `add_contact_mutual`— y se le abre esa
conversación.

Funciona igual para quien ya tiene cuenta: el enganche está atado a haber
entrado, no a haberse registrado. Si falla, la invitación **no se descarta**: se
reintenta la próxima vez que entre.

Ojo: el botón viaja dentro de la instantánea, así que **los catálogos
publicados antes de esto hay que republicarlos** para que lo tengan.

## 3. Que el cliente pueda responder con las imágenes del catálogo

Que quien recibe el catálogo pueda **escoger imágenes de productos, ponerles una
nota y enviárselas** al vendedor. Es la forma natural de decir "quiero este y
este, pero en azul".

> Este punto quedó a medio explicar y conviene confirmarlo antes de diseñarlo:
> entendí *seleccionar varias imágenes del catálogo + añadir una nota + mandarlas
> al chat del vendedor*. Si era otra cosa, corregir aquí antes de empezar.

## Qué falta probar del 1 y el 2

Lo que necesita sesión, que no se pudo verificar solo: que al terminar de
registrarse aparezca la conversación con el vendedor abierta, y que el botón
«Chatear» salga en un catálogo recién republicado.

Verificado sin sesión: la barra de compartir sobre el catálogo, que el enlace
`?vendedor=` se guarda y limpia la URL, que la pantalla de acceso saluda con el
nombre real sacado de `public_info`, y que el botón del catálogo se genera
apuntando a `?vendedor=<userId>`.
