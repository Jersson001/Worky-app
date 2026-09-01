# Estado de funcionalidades — Worky

Última revisión: 1 de septiembre de 2026.

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

**El orden de la lista** es el más reciente arriba. No lo era: la consulta no
llevaba `order` de ninguna clase y salía distinta en cada recarga. Y no se
ordena por `contacts.last_message_time`, que se escribe al crear el contacto y
nadie vuelve a tocar, sino por `user_chats`, que sí mantienen al día el envío y
el RPC `bump_unread`. Los contactos manuales no tienen fila ahí y se ordenan por
la fecha de su ficha: quedan abajo aunque se les escriba hoy.

**Cada uno ve sus herramientas.** El «+» del chat ofrece cosas distintas según
quién mire, porque el cliente guarda al vendedor como `supplier` y el vendedor
al cliente como `client`:

| Quién | Qué ve en el «+» |
|---|---|
| Cliente | Archivo, y nada más |
| Vendedor con su proveedor | Archivo · Recibo · Registrar gasto |
| Vendedor con su cliente | Cotización · Cuenta de Cobro · Factura · Recibo · Catálogo · Registrar gasto · Archivo |

Quién es cliente se decide con `esAnonimo || (llegó de un catálogo && no tiene
oficio)`. Mirar solo el oficio vacío **sería un error**: hay vendedores antiguos
sin oficio declarado —los mismos que ven todos los capítulos de cotización por
eso— y les quitaría sus herramientas. Ante la duda se le trata como vendedor.

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

**La instantánea ya no se mete en un iframe: la lee la app y la pinta ella.**
Hasta el 1 de septiembre de 2026 se incrustaba tal cual, en un `sandbox` sin
`allow-scripts`, y eso la dejaba muerta: ahí dentro no corre una línea de
JavaScript, así que no cabía un «me gusta» encima de cada foto ni forma de que
la app se enterara de lo que el visitante marcaba. Se llegó hasta donde llega el
CSS —`details` para las carpetas, `:target` para ampliar— y da para navegar, no
para elegir.

No hace falta abrirle permisos a ese HTML porque **nunca se ejecuta**: solo se
interpreta su estructura. Y por eso mismo los catálogos publicados antes siguen
funcionando; de ellos salen una foto por producto y ninguna carpeta, que es lo
que tenían.

### Cómo lo recorre el cliente

Las **carpetas** salen como fichas con su portada, su nombre y cuántos productos
tienen. Pulsa una y entra: las demás se apartan y queda una cabecera «← Nombre»
para volver. Con una sola carpeta no se pinta ninguna, por el mismo criterio que
las pestañas de la cotización: una carpeta suelta solo esconde el catálogo.

Cada producto enseña **hasta cuatro fotos**, la principal grande y el resto en
miniatura debajo, todas a la vista. Fueron un carrusel y no servía: nadie
descubre que hay que arrastrar, y quien entraba creía que el producto tenía una
sola foto.

Pulsa una foto y se amplía con un **«♡ Me gusta»**. Al darle, la foto se cierra
sola y abajo crece una **cinta** con lo marcado, que se mantiene al cambiar de
carpeta. Al confirmar se abre «Imágenes que me gustan» para escribir el mensaje
—«quiero algo así pero en otro color»— y mandarlo. Al vendedor le llegan
etiquetadas «cocina m1», «cocina m1 (foto 2)».

Tope de **seis fotos por envío**, que es del almacenamiento del navegador y no
del gusto: viajan como data URL en `localStorage` hasta que el cliente se
registra, y si no caben el pedido se guarda sin ellas.

**Ojo con el peso.** Las fotos van incrustadas y cada una suma unos 120 KB al
archivo que el visitante baja *antes de ver nada*: treinta modelos a tres fotos
son unos 10 MB. De ahí el tope de cuatro fotos por producto. El arreglo de fondo
—subirlas a Storage y referenciarlas por URL— cambia cómo se guardan los
productos y **no está hecho**.

**Las URL se adaptan al sitio.** Un enlace generado desde un preview de Vercel
apunta al preview; desde el APK o en local, a la app publicada — porque ahí el
origen es `localhost` y un QR con esa dirección no llevaría a ninguna parte.

---

## Documentos

Cotizaciones, facturas, recibos de caja, cuentas de cobro y comprobantes de
gasto. Se comparten por WhatsApp como HTML maquetado, con QR del catálogo al pie.

**Impresión.** La hoja se maqueta a 850 px y al imprimir se reduce entera con
zoom al 80 %, conservando la proporción. Ese `zoom` **necesita `!important`**:
la hoja lleva otro en línea desde React —el que la encoge para caber en
pantalla— y un estilo en línea gana a la hoja de estilos. Sin eso se imprime a
sus 850 px reales y se corta por la derecha. El 80 % tampoco es la cuenta
exacta: da 180 mm sobre los 190 útiles de un A4, y esa holgura es a propósito,
porque casi ninguna impresora llega al borde del papel.

---

## Cotización por capítulos

El modo **Personalizada** arma la cotización por capítulos, cada uno con sus
grupos y sus líneas, con fotos y comentarios por línea. El documento sale
desglosado igual en los tres sitios donde se pinta: la app, el enlace compartido
y el HTML que se sube.

Toda línea calcula igual: `cantidad × costo × (medida || 1)`. Así m², ml, m³,
puntos, viajes y global comparten la misma fórmula sin casos especiales. Qué
unidades multiplican por la medida lo decide `usaMedida()`, en un solo sitio.

### A cada oficio, sus capítulos

Worky no es solo para gente de obra: sirve a cualquiera que le lleve cuentas
claras a sus clientes. A un abogado la cotización básica le basta, y enseñarle
un capítulo de «Drywall y Cielorrasos» solo le hace dudar de si la app es para
él.

| Tipo de negocio | Capítulos |
|---|---|
| `carpinteria`, `muebles` | Carpintería |
| `decoracion` | Las dos |
| `construccion`, `reformas`, `pintura`, `plomeria`, `electricidad` | Obra blanca |
| `otro` | Ninguno: solo cotización básica |
| *(vacío o desconocido)* | Todos |

Sin oficio declarado se enseñan todos a propósito: eran 8 de 17 usuarios cuando
se hizo, gente que ya usaba los capítulos. Quien se registra ahora sí elige.

Cuando no hay capítulos, las pestañas Básica/Personalizada desaparecen enteras
—una sola pestaña solo invita a buscar la otra— y el modo se fuerza a básica.

Añadir una profesión son dos líneas: el `<option>` en `WelcomeOnboarding.tsx` y
su entrada en `GREMIOS_POR_OFICIO`. **Las dos**: si falta la del mapeo, cae en
el caso seguro y ve todo.

### Los capítulos

**Carpintería:** Cocinas Integrales, Clósets, Puertas, Gabinetes de Baño,
Centros de Entretenimiento, Muebles Especiales.

**Obra blanca:** Pintura y Estuco, Enchapes y Pisos, Drywall y Cielorrasos,
Puntos e Instalaciones, Demolición y Aseo, Impermeabilización, y Aparatos y
Materiales.

Las plantillas nacen con los nombres de lo que se suele cobrar y **todos los
costos en cero**: recuerdan qué va en cada capítulo, no sugieren precios.

### Material por línea

Cada línea de obra blanca lleva un interruptor de material, apagado por
defecto —muchos maestros cobran solo la mano de obra—.

El material **se compra por unidades de venta**, no en la unidad del trabajo: la
pintura se cobra por m² de muro pero se compra por galones. Su subtotal es
cantidad por precio, sin multiplicar por los metros.

Y hace la cuenta de la ferretería. Cada plantilla trae el **rendimiento** de su
material, así que 80 m² a 30 m² por galón proponen 3 galones, redondeando hacia
arriba porque medio galón no se compra. El rendimiento queda a la vista y
editable: cambia con el producto, las manos que se den y cómo esté la
superficie, y esconder el número que hace la cuenta sería opaco.

Rendimientos de partida: pintura 30 m²/galón · estuco 8 m²/bulto · masilla
12 m²/bulto · pega 5 m²/bulto · cerámica 1,5 m²/caja · drywall 2,9 m²/lámina ·
impermeabilizante 20 m²/cuñete · cemento 4 m²/bulto.

Cuando el trabajo no se mide en metros —puntos, viajes— no hay nada que dividir
y la cantidad la pone quien cotiza.

En el documento, el material va sangrado bajo su trabajo y abajo se separan
**Mano de obra** y **Materiales**. Ese desglose solo aparece si hay material: en
una cotización de pura mano de obra sobra y confunde.

`Aparatos y Materiales` —sanitarios, griferías, cerámica, iluminación— es para
lo que no cuelga de ningún trabajo. Va marcado `soloMaterial`: sus líneas cuentan
enteras del lado del material y no ofrecen el interruptor.

---

## Proyectos

**Un proyecto nace al aceptarse una cotización.** Se llama por el «Producto o
servicio» de esa cotización con su código detrás —`Cocina integral el U
(COT-7979)`—, porque dos cocinas cotizadas al mismo cliente darían dos proyectos
llamados igual y hay que distinguirlos para colgarles sus cuentas de cobro y sus
gastos.

También se pueden **añadir y borrar a mano** desde la ficha del contacto, para
el cliente que ya tenía obra en marcha. Los añadidos nacen sin `quote_code`, que
es lo que los distingue de los que vienen de una cotización.

Agregar un contacto **no** crea proyecto. Lo creaba, y de ahí salieron cinco
vacíos en «Consulta» con valor 0.

Tres cosas que costó encontrar, todas corregidas el 1 de septiembre de 2026 y
todas invisibles hasta que se miraron los datos de verdad:

- **Cada chat enseñaba todos tus proyectos.** `fetchProjectsForContact` incluía
  `client_id.eq.<yo>` y `contractor_id.eq.<yo>` sin atar nada al contacto. La
  doble vía es que un proyecto lo vean los dos lados de la *misma pareja*, no
  que cada uno vea todo lo suyo en cualquier conversación.
- **Aceptar una cotización no guardaba nada.** La app inventaba en memoria un
  proyecto por cada cotización aceptada del chat; al aprobar, ese inventado ya
  estaba puesto cuando el guardado comprobaba «¿ya existe uno con este código?»,
  daba que sí y se saltaba el `saveProject`. Los inventados desaparecían al
  recargar y no admitían ni un gasto.
- **El id era `Date.now().toString()`** para una columna `uuid`. Aunque no se
  hubiera saltado el guardado, Postgres lo habría rechazado con 22P02 — el mismo
  error que ya documenta [utils/id.ts](utils/id.ts).

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
- **Capítulos para oficios que no son de obra.** Un abogado o un sastre usan la
  cotización básica, que les sobra. Si algún día se quieren capítulos propios
  —«Honorarios», «Confección»— el mecanismo ya está: una entrada en el selector
  de tipo de negocio y otra en `GREMIOS_POR_OFICIO`.
- **Presupuesto de materiales aparte.** Los materiales salen dentro de la
  cotización, no como lista de compra independiente para la ferretería.

---

## Seguridad

Las políticas de la base se auditaron entera el 28 de agosto de 2026 y se
cerraron tres agujeros. Está todo en [SEGURIDAD.md](SEGURIDAD.md).

---

## Publicación

La versión 2.1 (`versionCode` 14) **fue rechazada** por Google Play: faltaban las
credenciales de la cuenta de demostración. Ver
[GUIA-GOOGLE-PLAY-STORE.md](GUIA-GOOGLE-PLAY-STORE.md).
