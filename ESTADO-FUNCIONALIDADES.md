# Estado de funcionalidades — Worky

Última revisión: 11 de septiembre de 2026.

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

**Acepta las políticas antes de crear la cuenta.** Una casilla con la Política
de Tratamiento de Datos y los Términos enlazados al lado, para que se pueda
leer lo que se acepta sin salir de la pantalla. Nace desmarcada: la Ley 1581
pide autorización previa, expresa e informada, y una casilla premarcada no es
un acto de quien se registra.

De la aceptación queda constancia —la fecha y qué versión— en la metadata del
alta, así que sobrevive aunque no llegue a confirmar el correo. Sin la versión
la prueba solo diría «aceptó algo, algún día», y el titular puede pedirla.
La versión vive en `utils/legal.ts`: al cambiar los documentos se sube esa
fecha, y a quien aceptó una anterior habrá que volver a pedírsela.

Los dos documentos están en `public/`, así que Vite los copia al build y
Capacitor los empaqueta: los enlaces funcionan dentro de la app y sin conexión.
El perfil tiene además un apartado **Legal** con los documentos, quién responde
por la aplicación —Ferry App S.A.S., con su NIT y su correo—, el aviso de
derechos y la solicitud de eliminación de cuenta, que Play exige a toda
aplicación con cuentas.

### Si pierde la contraseña

Hay «¿Olvidaste tu contraseña?» debajo del campo, que es donde se busca: en el
momento en que la contraseña no entra, mirando ese campo. Llega un correo, y al
volver del enlace sale una pantalla para escribir la nueva.

Hasta el 7 de septiembre de 2026 **no existía**: `resetPasswordForEmail` no se
llamaba desde ninguna parte, así que perder la contraseña era perder la cuenta,
con los contactos, los proyectos y los documentos dentro.

Lo que obliga a que la segunda pantalla exista, y a que vaya **por delante de
todo lo demás en el render**, es que el enlace de Supabase trae la sesión
puesta: sin interceptarlo, la persona entraba directa a la aplicación con la
contraseña vieja sin cambiar —justo la que no recordaba— y no volvía a ver la
pantalla. Se reconoce por el evento `PASSWORD_RECOVERY` y, para el primer
pintado, por la URL.

El destino del enlace es la app publicada y no el origen actual: desde el APK el
origen es el propio teléfono y el enlace no llevaría a ninguna parte.

**Falta configurar un SMTP propio en Supabase.** Con el servicio interno los
correos van limitados a unos pocos por hora, se retrasan o caen en no deseado, y
Supabase mismo dice que no es para producción. Sin eso, esto funciona en el
código y no en la práctica.

### Entrar con Google

Hay «Continuar con Google» en la pantalla de acceso y en la del alias, con la
«G» a cuatro colores dibujada en el código —sus normas de marca exigen esos
colores exactos, y el `fa-google` empaquetado es de un solo tono—.

Quien entra así queda con **cuenta recuperable y con su correo desde el primer
momento**, sin escribir una contraseña. Para el invitado del QR es el mejor
camino: resuelve de una vez lo que la cinta de «completa el registro» lleva
meses sin conseguir.

Vive detrás de `GOOGLE_LISTO` en `LoginScreen.tsx`. No es prudencia de más:
`signInWithOAuth` no falla en el navegador, sino que se lleva a la persona a
Supabase, y con el proveedor apagado revienta allí con un JSON crudo y sin
forma de volver. O sea que el botón mal configurado no da un error feo: echa al
cliente fuera de la aplicación.

**En el APK todavía no funciona.** Capacitor carga la app desde el propio
teléfono, así que el regreso de Google no tiene a dónde volver; hace falta
configurar deep links en Android.

Un usuario puede tener los dos accesos a la vez —`email` y `google` sobre la
misma cuenta— y entra con cualquiera de los dos.

#### Lo que costó ponerlo en marcha

Tres fallos seguidos, y ninguno estaba en el código:

1. **`Site URL` seguía en `http://localhost:3000`**, el valor por defecto de
   Supabase. Google autenticaba bien y el regreso mandaba el teléfono a una
   dirección que no existe: «Safari no puede conectarse al servidor». **Esto
   rompía también el correo de recuperar contraseña**, que lleva al mismo
   sitio: dos fallos con una sola causa.
2. **`invalid_client`**: lo pegado en Supabase no coincidía con ningún secreto
   de Google. Se ve en los registros de auth, no en el navegador.
3. **La prueba era inválida**: se escaneó el QR propio con la cuenta propia, y
   la app hace bien en no abrir un chat de alguien consigo mismo.

De los tres, ninguno se puede diagnosticar desde el navegador. Los dos primeros
salen preguntándole al servidor:

```bash
# ¿A dónde devuelve? Debe ser worky-app-khaki, no localhost
curl -s -o /dev/null -w "%{redirect_url}" \
  "https://<ref>.supabase.co/auth/v1/callback?error=x&error_description=x"
```

Y los errores del intercambio, en los registros de `auth_logs` del proyecto.

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

**Se le piden el correo y el celular ahí mismo, opcionales**, con la razón
dicha. No para dejarle entrar —eso convertiría el atajo en el formulario que se
quiso evitar— sino porque sin ellos quien vende se queda con un nombre y una
conversación y nada más. Al 9/09/2026 había **catorce conversaciones así**, doce
de ellas con mensajes de verdad, y en las catorce el teléfono, el correo y el
alias de la ficha estaban vacíos. Van en la metadata de la cuenta y no en
`email`/`phone` de auth, que exigen verificación y dejarían la cuenta anónima a
medias.

En la cinta de completar el registro sí son **obligatorios** los dos: eso ya no
es entrar, es dejar la cuenta recuperable, y sin forma de encontrar a la persona
no sirve de nada.

**Ninguna de esas catorce se ha registrado nunca**, lo que dice que la cinta
sola no basta. De ahí que entrar con Google sea el mejor camino para el
invitado: le deja cuenta recuperable y correo sin escribir una contraseña.

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

**Mandar algo del catálogo.** El «+ → Catálogo» abre «Catálogo de Productos»:
carpetas, se entra en una, se toca el producto y **se elige qué foto enviar**.
Va una sola. Antes iba el producto entero y uno de doce fotos propias —los hay—
volcaba una grande, tres miniaturas y un «+8» en la conversación, que se lee
como si se hubiera mandado la carpeta entera. En el chat se manda una imagen
para enseñar algo, no un catálogo. Con una sola foto no hay nada que escoger y
va directa, sin el paso de en medio.

En la cotización es al revés y por eso el mismo selector lleva un interruptor
(`porFoto`): allí la línea sí quiere todas las fotos del producto.

Ese mensaje **no se veía**. El tipo `product` estaba excluido de la rama que
pinta el texto, junto a los demás que tienen tarjeta propia, pero la suya no
existía: salía una burbuja vacía con solo la hora. Se mandaba y no llegaba.
Corregido el 9/09/2026 con `ProductBubble`, que además pone el nombre del
producto como texto del mensaje —la burbuja no lo pinta, tiene el suyo— porque
es lo que se lee en la lista de chats, que con el texto vacío quedaba en blanco.

---

### La ficha del contacto

Bajo el nombre salen **el correo y el celular con los que se registró**, que es
lo que se busca al abrir la ficha para escribirle por fuera de Worky.

No viajan con el contacto. La fila de `contacts` los tiene vacíos cuando se
agregó a alguien que ya tenía cuenta: sus datos son suyos y viven en su perfil,
no en la copia que guarda quien lo agrega. Pero `user_profiles` solo se lee de
uno mismo, y con razón —ahí están también el NIT, la dirección, si es
administrador y la suscripción—, así que abrirla para enseñar un correo
publicaría todo lo demás.

Van por `datos_de_contacto`, una función que lee por dentro con permisos de
dueño y devuelve **exactamente esos dos campos**, y solo si quien pregunta ya
tiene a esa persona agregada. No es «el correo de cualquiera»: es «el correo de
alguien con quien ya estoy hablando». Está en
[supabase_datos_de_contacto.sql](supabase_datos_de_contacto.sql), aplicada en
producción el 7/09/2026 y comprobada con las tres identidades: sin sesión no
devuelve nada, el dueño ve los dos datos, y un tercero que no lo tiene agregado
no ve nada.

Quien no está registrado no enseña nada, que es lo correcto: un contacto manual
no tiene cuenta y sus huecos no son datos.

### El avatar de quien no tiene foto

Sus iniciales sobre un color, dibujadas en el propio teléfono
([utils/avatar.ts](utils/avatar.ts)). El color sale del nombre, así que la misma
persona se ve igual en todas las pantallas sin guardar nada.

Antes se le pedían a `ui-avatars.com`, **con el nombre de la persona dentro de
la dirección**: el nombre de cada contacto viajando a un servicio ajeno cada vez
que se pintaba una lista, a cambio de una imagen que son cuatro líneas. En el
formulario de Seguridad de los datos de Play eso obligaba a declarar que Worky
comparte nombres con terceros.

Se quitó el 7 de septiembre de 2026, y no bastaba con el código: el trigger de
registro escribía esa dirección en `public_info`, y 47 filas ya la llevaban
guardada. Las dos cosas, limpiadas en la base. `fotoOIniciales` descarta además
las que queden, porque un documento compartido guarda su copia de los datos y
vive treinta días.

De propina, las iniciales salen al instante y **funcionan sin cobertura**, que
es donde antes quedaban huecos grises.

---

## Notificaciones

Dos cosas distintas que se llaman igual:

- **Con la app abierta**: el panel de notificaciones y los avisos que saltan
  mientras se está mirando. Existía desde antes.
- **Con la app cerrada**: que suene el teléfono cuando un cliente escribe.
  Montado el 11/09/2026, y solo en la app instalada.

**Solo en el teléfono.** En el navegador no se registra nada: las notificaciones
web son otra cosa, con otro permiso y otro camino, y llamar al plugin fuera de
la app instalada solo da un error de «no implementado».

### Cómo está armado

| pieza | qué hace |
|---|---|
| services/pushService.ts | pide el permiso, guarda el token, lo suelta al cerrar sesión |
| push_tokens | una fila por aparato, cerrada: cada quien solo ve los suyos |
| disparador on_message_created | llama a la función cuando entra un mensaje |
| supabase/functions/notificar-mensaje | busca los aparatos y manda el aviso por FCM |

**Una fila por aparato y no por persona**: quien usa Worky en el teléfono y en
la tablet quiere que le suenen los dos. El token se reescribe en cada arranque
porque FCM lo rota por su cuenta —al reinstalar, al limpiar los datos— y un
token viejo no falla al enviar, simplemente no llega.

**Se engancha al iniciar sesión, no al abrir la app.** Por dos razones: el token
se cuelga de una cuenta, y pedir el permiso antes de que la persona sepa qué es
Worky es la forma más segura de que lo niegue para siempre.

**El aviso sale del servidor y no de la app del que escribe.** Quien manda puede
cerrar Worky en el mismo segundo y el aviso no saldría nunca; y desde el cliente
cualquiera podría mandarle notificaciones a quien quisiera.

### Lo que protege al mensaje

Un mensaje que no llega es lo único que no se puede perder, así que hay tres
cosas puestas para que avisar no pueda costarlo:

1. pg_net llama **sin esperar respuesta**, así que un fallo de red al avisar no
   retrasa el guardado.
2. El disparador captura cualquier error y devuelve NEW igual.
3. La función responde 200 incluso cuando falla.

Sin FIREBASE_SERVICE_ACCOUNT configurado no hace nada y lo dice. Los tokens
que FCM da por muertos —app desinstalada, datos limpiados— se borran solos en
vez de reintentarlos en cada mensaje para siempre.

### Lo que cambia para Play

**El token de FCM es un identificador de dispositivo.** En el formulario de
Seguridad de los datos se declaró que Worky no recoge ninguno, y eso deja de ser
cierto en cuanto esto se publique. Hay que actualizar esa declaración y
mencionarlo en la política antes de subir una versión con notificaciones.

---

## El dominio

Lo que se comparte va por **worky.ferryapp.co** desde el 11/09/2026. Es
subdominio de erryapp.co, que ya era de Ferry App, así que no costó nada y
además dice quién publica Worky.

**El anterior, worky-app-khaki.vercel.app, sigue funcionando y no se debe
retirar**: los QR impresos y los enlaces ya repartidos apuntan ahí, y un QR en
papel no se puede corregir. Vercel mantiene los dos a la vez, y ambos están
dados de alta en Supabase y en Google.

En el código solo existe APP_PUBLICADA, que es el destino por defecto cuando
no hay un origen real del que tirar —el caso del APK—. Desde la web,
origenCompartible usa el origen actual, así que los enlaces salen con el
dominio por el que se entró.

Cambiar de dominio toca cinco sitios, y tres están fuera del código: el Site
URL y las Redirect URLs de Supabase, los orígenes autorizados de Google, y
las URLs de política y eliminación de cuenta en Play. Si se olvidan los de
Supabase se rompen entrar con Google y recuperar la contraseña.

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

**El cliente ve el mismo documento que se imprime.** Hubo dos maquetas del mismo
documento —la que ve e imprime quien lo manda, y otra distinta para la página
del enlace—, y eso significa hacer cada mejora dos veces. Cuando se olvidaba
una, se notaba: las fotos llevaban meses en el documento de verdad y en el
enlace no salían, así que el cliente aprobaba un precio **sin ver lo que estaba
comprando**. Y en la cotización básica, que es la que usa casi todo el mundo, no
salían nunca; en la de capítulos sí.

Desde el 7 de septiembre de 2026 `SharedDocumentViewer` no maqueta nada: carga
el JSON guardado y se lo pasa a `DocumentViewer`. El JSON que ya se subía trae
exactamente lo que ese componente pide —tipo, datos, logo, firma y perfil—, así
que no hubo nada que adaptar.

Al componente se le añadió lo justo para distinguir a un cliente de su dueño:
`soloLectura` le quita mover la firma ajena y volver a compartir por WhatsApp,
`onClose` pasa a ser opcional porque ahí el documento **es** la página,
`acciones` y `pie` colocan lo de responder y el catálogo alrededor, y
`catalogoUrl` hace que el QR lleve al catálogo del vendedor y no al genérico
—sin sesión no había de dónde deducirlo, y llevaba a la app a secas—.

**Impresión.** La hoja se maqueta a 850 px y al imprimir se reduce entera con
zoom al 80 %, conservando la proporción. Ese `zoom` **necesita `!important`**:
la hoja lleva otro en línea desde React —el que la encoge para caber en
pantalla— y un estilo en línea gana a la hoja de estilos. Sin eso se imprime a
sus 850 px reales y se corta por la derecha. El 80 % tampoco es la cuenta
exacta: da 180 mm sobre los 190 útiles de un A4, y esa holgura es a propósito,
porque casi ninguna impresora llega al borde del papel. **Nunca subirlo al
86 %**, que es la cuenta justa: da 193 mm y se come la columna de la derecha.

Bajarlo tampoco: se probó al 74 % para meter una cotización larga en una hoja y
se volvió al 80 %. Encogerlo de fábrica le hace la letra más pequeña a todo el
mundo para resolverle el caso a unos pocos, y una cotización larga no cabe por
mucho que se reduzca. Quien lo necesite tiene la escala en el diálogo de
impresión.

**El documento se monta colgado del `body`, con un portal.** No es un detalle
de estilo: vive dentro del árbol de la aplicación, y para imprimirlo solo a él
se le sacaba del flujo con `position: absolute`. Lo posicionado en absoluto
**no se reparte en páginas** —el navegador lo pinta en la primera y corta—, así
que una cotización de dos hojas salía sin su final: sin firma y sin cierre.
Colgado del `body` se puede esconder la aplicación entera (`#root { display:
none }`, que activa la clase `imprimiendo-documento`) y dejar el documento en
flujo normal, que es lo único que sabe paginar. El `position: absolute` se
queda solo para el informe financiero, que lo sigue necesitando.

Lo que no debe partirse entre hojas lo dicen reglas propias: las filas, la
firma —el garabato en una hoja y su raya en la siguiente queda pésimo en un
documento que el cliente firma—, los totales y el bloque de foto y comentario.
El encabezado de la tabla se repite en cada página; sin él, la segunda son
cifras en columnas sin nombre.

Los espacios se aprietan **solo en papel**, con las clases `marco-doc`,
`cuerpo-doc`, `cabecera-doc` y `cierre-doc`: unos 82 mm entre el aire de la
cabecera, el del cierre y el hueco del pie, que en pantalla se agradecen y en
la hoja empujaban el final a una segunda página casi vacía.

El HTML que se comparte lleva sus propias reglas de A4 —`@page` con márgenes de
12 mm, `print-color-adjust: exact` para que los fondos azules no salgan en
blanco, y los mismos cortes de página—. El ancho nunca fue problema ahí: la
maquetación es fluida y cede ante un papel más estrecho.

El encabezado con la fecha y la URL que sale arriba al imprimir **lo pone
Chrome, no Worky**: se quita desmarcando «Encabezados y pies de página» en su
diálogo. No hay CSS que lo controle.

### Forma de pago y condiciones de negociación

Lo que en el formato de papel iba al pie. Sin ello el cliente aprueba una cifra
y luego se discute el plazo, el anticipo, qué incluye y qué cubre la garantía.

**La forma de pago la ven todos los oficios**, que cobrar se cobra en todos. Se
escribe solo el porcentaje del anticipo y el saldo sale por resta, para que los
dos números sumen el total sin céntimos perdidos; los montos van calculados. La
cuenta se elige de la libreta de datos de pago y **se copia entera en el
documento**, no por referencia: si mañana se borra de la libreta, la cotización
que ya se mandó tiene que seguir diciendo a dónde consignar. Mismo criterio que
el QR de los recibos.

**Las condiciones son de carpintería y obra**, los oficios con capítulos, donde
se pacta plazo, anticipo y garantía. Cinco apartados —entrega, qué no incluye,
qué pone la obra, garantía y notas—, cada uno con su interruptor y su texto
editable, un renglón por punto.

Se guardan **en el perfil**, no en cada cotización: un carpintero manda las
mismas siempre, y reescribir «la obra deberá garantizar la seguridad de los
materiales» cada vez es trabajo que nadie hace dos veces. Viven en
`user_profiles.condiciones_cotizacion` (jsonb) y `anticipo_porcentaje`
(smallint, 0–100). Se retocan en una cotización concreta sin tocar la
plantilla, y un botón las deja como las de siempre.

### Cotizar por tallas

En confección la cantidad no se escribe, se cuenta: un pedido de uniformes no
son «20 camisas», son 3 S, 8 M, 6 L y 3 XL. Ese desglose es lo que el cliente
revisa y lo que se manda a producción, y antes acababa escrito a mano en el
campo de comentarios.

La línea lleva su cuadro de tallas, igual que las de obra llevan su material.
Las rejillas están en `utils/tallas.ts`: camisa por letra (XS–XXL), pantalón por
cintura (28–40), calzado por número (34–44) e infantil por edad (4–16). Al
encenderlo **la cantidad deja de escribirse** y sale de sumarlas; dejarla
editable permitía que la cantidad y el desglose dijeran cosas distintas en el
mismo documento.

Nace apagado —la mayoría de las líneas no son prendas— y cambiar de rejilla no
arrastra las cantidades: una M de camisa no es una 32 de pantalón.

**La cuenta sale de sumar las tallas, no de `quantity`.** Ese campo no se
escribe en una línea con tallas y se queda en el 1 de la plantilla, así que el
documento llegó a decir «1 und» encima de un desglose de cinco prendas.
Corregido el 9/09/2026 en `describeCantidad`, que es de donde lo lee el
documento.

Los rangos están sin validar con un taller de verdad. Si hace falta la 46 en
calzado, es un renglón en `REJILLAS`.

### Ropa deportiva

Tiene capítulo propio, y es el único de confección que nace con los grupos
puestos. Un uniforme deportivo no es una prenda suelta: son cinco prendas, más
el escudo del club y el del patrocinador, más la numeración y el nombre de cada
jugador. Lo que se olvida cobrar en un pedido de equipo no es la camiseta, es el
escudo del patrocinador y los veinte números, así que cada renglón visible es un
renglón que se cobra.

**Se pregunta por prenda, no por rejilla de medida.** Los botones son Camiseta,
Pantaloneta, Medias y Uniforme completo, porque un equipo compra una de esas
cuatro cosas; enseñarle «Calzado» no le dice nada. Las tallas van todas juntas,
que es como llega la lista de un equipo: 4 a 16, las de niño por letra, y XS a
XXL. La línea se renombra sola con la prenda elegida mientras el nombre siga
siendo uno de los automáticos —«Camiseta» se sustituye, «Camiseta local con
patrocinador» se respeta—, para que el documento no diga «Uniforme» encima de un
desglose de camisetas.

**Cada talla puede llevar su número y su nombre**, en dos campos separados y no
en un texto de corrido: así en la cotización salen alineados en columnas y el
cliente repasa su lista jugador por jugador antes de aprobar. Un nombre mal
impreso es una prenda perdida. Al añadirlos la cantidad de esa fila pasa a 1
—la fila es de una persona—, pero queda editable, que hay quien pide dos
camisetas iguales para el mismo jugador. Sin numeración el documento se queda
con el resumen de una línea, que ocupa mucho menos.

Pantaloneta, medias, sudaderas y chaquetas son grupos con interruptor: un pedido
de camisetas no lleva sudaderas, y tenerlas siempre a la vista obligaba a
borrarlas en cada cotización.

El **ponchado** va en GLOBAL y con su propia línea: digitalizar el logo para la
máquina se paga una vez por logo, no por prenda. Dentro del precio unitario se
multiplicaría por todo el pedido o se olvidaría cobrar.

Las tallas de niño y los rangos **están sin validar con un proveedor de
uniformes deportivos**. Es lo primero que hay que preguntar.

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
| `moda_textiles`, `calzado`, `belleza`, `articulos_varios` | Ninguno: se vende de catálogo |
| `otro` | Ninguno: solo cotización básica |
| *(vacío o desconocido)* | Todos |

Sin oficio declarado se enseñan todos a propósito: eran 8 de 17 usuarios cuando
se hizo, gente que ya usaba los capítulos. Quien se registra ahora sí elige.

Los de comercio no ven capítulos porque ahí se vende de catálogo y se cotiza
por cantidad, no por metro lineal de mesón. La forma de pago y la cuenta sí las
ven, y los de confección tienen su cuadro de tallas.

Cuando no hay capítulos, las pestañas Básica/Personalizada desaparecen enteras
—una sola pestaña solo invita a buscar la otra— y el modo se fuerza a básica.

**Añadir una profesión es una línea**, en `utils/tiposDeNegocio.ts`. Estaba
escrita en tres sitios —el registro, el editor de perfil y la tabla de gremios—
y olvidar el tercero no daba error: `gremiosVisibles` le enseña *todos* los
capítulos a quien no reconoce, así que una tienda de ropa habría visto «Cocinas
Integrales» en su cotización. Ahora la lista es una y la tabla se deriva de
ella. El selector va agrupado en «Obra y construcción» y «Comercio», que con
trece opciones seguidas ya no se lee.

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

### El balance y la utilidad

Por proyecto: cuánto vale, cuánto se ha cobrado y cuánto falta. Y debajo, cuando
hay gastos apuntados, cuánto se ha gastado y la **utilidad estimada**.

Los gastos **no se le enseñan al cliente**: son cuentas de la casa —lo que
cuesta hacer la obra— y de ellas sale lo que se le está ganando. El recibo de
caja sí los ve, porque es un avance suyo. Lo separa el `esCliente` del panel.

**Los gastos se guardaban y no se volvían a leer.** `fetchProjectsForContact`
devolvía `expenses: []` fijo y nunca consultaba la tabla, así que un gasto vivía
en pantalla lo que durase la sesión y al recargar el balance decía «sin gastos
registrados» con el recibo ahí al lado, en Documentos. Con ello caía también la
utilidad: el desglose ya estaba escrito, pero solo se pinta si hay gastos, y
siempre llegaban en cero. Corregido el 7 de septiembre de 2026, con una sola
consulta para todos los proyectos del contacto — uno con diez proyectos hacía
diez viajes.

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
- **Capítulos para oficios que no son de obra ni confección.** Un abogado o un
  peluquero usan la cotización básica. Confección ya tiene los suyos —uniformes
  empresariales y escolares, dotación y EPP, prendas a medida, personalización—.
  Para añadir otros el mecanismo está: darle gremios a su entrada en
  `utils/tiposDeNegocio.ts` y escribir los capítulos.
- **Lo que cobra la confección aparte de la prenda.** El **ponchado**
  —digitalizar el logo, pago único que se olvida cobrar—, la personalización
  por unidad (bordado, estampado) y la muestra de aprobación. Por ahora el
  ponchado se pone como línea suelta sin tallas y funciona.
- **Presupuesto de materiales aparte.** Los materiales salen dentro de la
  cotización, no como lista de compra independiente para la ferretería.
- **Condiciones de negociación para los oficios sin gremio.** Belleza,
  artículos varios y «Otro» no las ven: no tienen capítulos, y los textos de
  fábrica son de obra o de confección, así que no les servirían. Carpintería,
  obra y confección sí tienen las suyas —esta última con su apartado propio de
  cambios y tallas, que en obra no hace falta—.

---

## Seguridad

Las políticas de la base se auditaron entera el 28 de agosto de 2026 y se
cerraron tres agujeros. Está todo en [SEGURIDAD.md](SEGURIDAD.md).

---

## Las dos pantallas de arranque

En el teléfono se ven dos antes que nada: la nativa que pinta Android, y la de
carga que va dentro del HTML mientras arrancan el JavaScript y los estilos.

Las dos llevaban restos de la plantilla hasta el 9/09/2026. **La nativa mostraba
el aspa azul de Capacitor** —el logo de la herramienta con la que está hecha la
app, no el de Worky—; se había quedado porque `@capacitor/assets` solo la genera
si existe `assets/splash.png`, y ahí solo estaban los archivos del icono. **La
de carga era azul marino con un emoji de teléfono** dentro de un cuadrado
morado.

Ahora las dos llevan el logo sobre blanco. Claras a propósito: la aplicación no
tiene modo oscuro —es blanca de principio a fin—, así que una pantalla de
arranque oscura solo produce un fogonazo al entrar, y sobre fondo oscuro al logo
se le ve un halo porque trae los bordes fundidos contra blanco. Por eso la
variante de modo oscuro de Android es igual de clara.

La de carga va con estilos escritos dentro del HTML, y eso no es descuido: es lo
único que se ve mientras la hoja de estilos todavía carga, así que no puede
depender de Tailwind. El logo está en `public/`, o sea empaquetado: se ve sin
conexión, que es cuando más importa que la app arranque bien.

---

## Publicación

Worky lo publica **Ferry App S.A.S.**, NIT 902.028.115-2, con domicilio en
Bogotá. Sus datos están en `utils/legal.ts`, que es de donde los leen el
registro, el apartado Legal del perfil y los documentos.

**Las tres páginas públicas**, en `public/` y por tanto empaquetadas con la app:
la política, los términos y `eliminar-cuenta.html`. Esa última la exige Play a
toda aplicación con cuentas, y **tiene que ser una URL `https:`** a la que se
llegue sin tener la app instalada: el `mailto:` del perfil no vale para ese
campo del formulario, y además no le sirve a quien ya no puede entrar. Dice qué
se borra, qué se conserva y por qué —los documentos ya compartidos siguen en
poder de quien los recibió hasta que caducan— y en cuánto tiempo.

**El formulario «Seguridad de los datos»** se resolvió campo por campo el 7 de
septiembre de 2026, sacando cada respuesta del código y de la base: once tipos
de dato recopilados, ninguno compartido, y nada de ubicación, analítica, fallos
ni identificadores —comprobado en las dependencias y en el manifiesto, cuyos
permisos son solo cuatro: internet, estado de la red, cámara y vibración—.

**Historia de los `versionCode`.** No se reutilizan aunque la versión nunca
llegue a publicarse, así que cada intento fallido quema un número:

| | |
|---|---|
| 14 (2.1) | Rechazado: faltaban las credenciales de la cuenta de demostración |
| 15 | Enviado el 29/08/2026 |
| 16 | Rechazado por apuntar a API 35, y aun así se quedó con el número |
| 17 (2.2) | Catálogo en la cotización, «Cotizar» sobre una foto, datos de pago con QR, API 36 |
| 18 (2.3) | Políticas y apartado legal, forma de pago y condiciones, cotizar por tallas, oficios de comercio, impresión en A4 |
| 19 (2.4) | Los estilos empaquetados en vez de pedidos a un CDN, los cuatro fallos de la primera prueba con un cliente real, el botón de responder en el documento, y la cotización de confección |
| 20 (2.5) | Recuperar la contraseña, los gastos del proyecto en el balance, el correo y el celular en la ficha del contacto, el enlace compartido con el mismo documento que se imprime, y las iniciales dibujadas en el teléfono. |
| 21 | Enviado a Play |
| **26091001 (2.6.0)** | Capítulo de ropa deportiva —prendas, escudos, numeración y nombre de cada jugador—, el producto del catálogo que se mandaba al chat y no se veía, y las dos pantallas de arranque con el logo de Worky |

Play exige **API 36** desde el 1 de septiembre de 2026.

**El 26091001 (2.6.0) está compilado y firmado.** El `versionCode` va por
fecha desde hoy, que llevarlo a mano costó dos rechazos de Play por repetido. El 19 y el 20 ya se subieron a Play, así que
sus números están gastados. La 2.4 se probó en un teléfono, un Motorola G13, y **en modo avión**: se
ve con sus estilos, sus iconos y su tipografía. Hasta el 18 la aplicación se los
pedía a un CDN al arrancar y sin cobertura salía en crudo. Cómo se compila y se
prueba está en
[GENERAR-APK-ANDROID-STUDIO.md](GENERAR-APK-ANDROID-STUDIO.md) — con la
distinción entre el `.aab`, que solo se sube a Play, y el `.apk`, que es el que
se instala.

**Lo que queda antes de subir el 21:**

1. **Llenar «Seguridad de los datos»** en Play Console. Es un formulario aparte
   de la política y **tiene que coincidir con ella**: declarar de menos es
   motivo de rechazo.
2. **Rotar la clave de subida**, que quedó expuesta en el historial público de
   git.
3. Mirar si la cuenta de Play es personal o de organización. Si es personal
   piden el **D-U-N-S**, que tarda semanas.
4. Que un abogado lea una vez la política y los términos.

Ver [GUIA-GOOGLE-PLAY-STORE.md](GUIA-GOOGLE-PLAY-STORE.md).
