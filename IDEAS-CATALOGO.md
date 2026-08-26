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

## 3. Que el cliente pueda responder con las imágenes del catálogo — HECHO

Confirmado con el usuario: marcar fotos del catálogo y que le lleguen al chat.

Sobre el catálogo hay un botón «Me interesan». Abre un selector con los
productos, se marcan los que interesan, se escribe una nota y se manda. Como
quien lo hace todavía no tiene cuenta, la selección se guarda igual que el
vendedor y sale sola al entrar: primero un mensaje de texto con la lista y la
nota, y detrás cada foto como imagen del chat.

Detalles que conviene no deshacer sin querer:

- Los productos se leen **de la propia instantánea**, con `DOMParser`, no de la
  base: el visitante no tiene sesión. De paso, funciona con los catálogos
  publicados antes de esto.
- El selector lo dibuja la app, fuera del iframe, para no tener que darle
  `allow-scripts` a contenido publicado por un usuario.
- El pedido **se olvida antes de mandarse**: más vale que llegue incompleto a
  que le llegue repetido al vendedor cada vez que el cliente abra la app.
- Tope de seis productos por pedido, porque las fotos viajan como data URL por
  el almacenamiento del navegador. Si no caben, se guarda sin fotos antes que
  perder el pedido entero.

## Qué falta probar

Todo lo que necesita sesión, que no se puede verificar solo: que al terminar de
registrarse aparezca la conversación con el vendedor abierta, que el pedido le
llegue al vendedor (texto y fotos), y que el botón «Chatear» salga en un
catálogo recién republicado.

Verificado sin sesión, en el navegador: la barra sobre el catálogo con sus tres
botones; el selector, que lee los productos reales de la instantánea; que al
marcar uno el botón pasa a «Enviar 1 a <negocio>»; que al mandarlo se guarda el
pedido con la nota y la foto; que la URL queda limpia; y que la pantalla de
acceso saluda con el nombre real sacado de `public_info`.
