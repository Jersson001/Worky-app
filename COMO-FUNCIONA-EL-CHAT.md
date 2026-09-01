# Cómo funciona el chat

Última revisión: 1 de septiembre de 2026.

> Este documento describía el chat sobre Firebase Realtime Database, con un
> `userIndex/` de claves escapadas y login por SMS. Nada de eso sigue siendo
> cierto: el backend es Supabase desde la migración. Se reescribió comprobando
> cada punto contra [services/messagingService.ts](services/messagingService.ts)
> y los `.sql` de la raíz.

---

## Para chatear hay que ser contacto

No hay directorio ni búsqueda por nombre. Dos personas se encuentran de una de
estas tres formas:

| Cómo | Qué pasa |
|---|---|
| **Búsqueda por correo o celular** | Se consulta `public_info` por el identificador exacto |
| **QR o enlace del catálogo** | El botón «Chatear» entra como `?vendedor=<userId>` y la app crea el contacto sola |
| **Contacto manual** | El vendedor crea la ficha de alguien que no usa Worky |

### La búsqueda

`searchUserByPhoneOrEmail` prueba tres cosas, en orden:

1. Coincidencia exacta en `public_info.phone_or_email`, que guarda el
   identificador **ya normalizado en minúsculas**. La búsqueda normaliza igual;
   si difieren, no encuentra nada.
2. El mismo término sin espacios, guiones ni paréntesis, porque un celular se
   escribe de muchas formas y se guardó de una sola.
3. `user_index` por `safe_key`, con las claves «escapadas» al estilo Firebase.
   Es compatibilidad pura: ahí quedaron las cuentas registradas antes del
   trigger que llena `public_info`.

Buscarse a uno mismo devuelve `null`.

`public_info` es de **lectura pública** a propósito: quien acaba de escanear un
QR todavía no tiene sesión y hace falta para decirle de quién es el catálogo que
está mirando (`getPublicInfoById`).

---

## Agregar a alguien crea las dos fichas

`addContact` llama al RPC **`add_contact_mutual`** (el de 7 parámetros), que
inserta la ficha tuya y la suya en la misma transacción. Sin eso el otro no se
entera de nada: puede escribirte, pero no te ve en su lista.

Estuvo roto un tiempo —la versión desplegada con alias solo creaba la ficha del
que agrega— y se corrigió en
[supabase_contactos_ficha_inversa.sql](supabase_contactos_ficha_inversa.sql).

Si el RPC falla, hay un camino de respaldo que inserta directo en `contacts`.
Ese respaldo solo crea **tu** ficha, así que un fallo del RPC deja la relación a
medias: es red de seguridad, no equivalente.

El respaldo reintenta sin las columnas `alias` y `email` si la base todavía no
las tiene (error `42703`), antes que perder el contacto entero por una columna
que falta. Ver [supabase_contacts_email.sql](supabase_contacts_email.sql).

### Contactos manuales

Un contacto sin cuenta nace con id `lead_<uuid>` y va a `contacts` con
`contact_user_id` en `NULL`, porque esa columna tiene clave foránea a
`auth.users` y ahí no existe.

Ese prefijo `lead_` hace que el id **no sea un uuid válido**, y choca con
`contacts.id` y `projects.contact_id`, que sí lo son. Sigue pendiente; está
anotado en [PENDIENTE-CATALOGO-STORAGE.md](PENDIENTE-CATALOGO-STORAGE.md).

---

## Los mensajes

Todos viven en la tabla `messages`. La conversación se identifica por
`chat_id`, que es **determinista y simétrico**:

```js
[userId1, userId2].sort().join('_')
```

Los dos extremos calculan el mismo id sin ponerse de acuerdo. De eso depende que
no haya chats cruzados.

El destinatario se anota de dos formas según con quién hables:

| A quién | Columnas |
|---|---|
| Usuario de Worky | `recipient_id = <uid>` |
| Contacto manual | `recipient_id = NULL` y `recipient_contact = <id>` |

`recipient_contact` es columna aparte porque `recipient_id` tiene clave foránea
a `auth.users`. Y **solo se manda cuando hace falta**: si viajara siempre, los
envíos entre usuarios se romperían en cuanto alguien corriera una versión
anterior a
[supabase_mensajes_a_contactos_manuales.sql](supabase_mensajes_a_contactos_manuales.sql).

Quién es quién se decide con `esUsuarioDeWorky`, que descarta de entrada lo que
ni siquiera tiene forma de uuid y cachea el resultado.

El `'me'` / `'other'` de cada burbuja **no se guarda**: es relativo a quien mira,
así que se deriva comparando contra el uid propio en cada lectura.

---

## Tiempo real

`listenToMessages` carga los **últimos 100 mensajes** del chat y luego se
suscribe a los INSERT con la API de `supabase-js` v2:

```js
supabase.channel(uniqueTopic(`chat:${chatId}`))
  .on('postgres_changes', { event: 'INSERT', table: 'messages', filter: `chat_id=eq.${chatId}` }, …)
```

Dos detalles que conviene no deshacer:

- **`uniqueTopic`.** `supabase.channel(topic)` devuelve la instancia existente si
  el topic coincide, incluida una ya suscrita o a medio cerrar (`removeChannel`
  es asíncrono). Añadirle un `.on('postgres_changes')` a esa instancia lanza
  `cannot add ... after subscribe()` y tumba la app. Con sufijo aleatorio cada
  suscripción estrena canal; quien decide qué eventos llegan es el filtro, no el
  topic.
- **El INSERT propio también rebota** por el canal, así que se deduplica por id.
- **La carga inicial pide descendente y le da la vuelta.** Con `ascending: true`
  el `limit(100)` recorta por el otro extremo: una conversación de más de 100
  mensajes se abría por el principio, con los últimos fuera. El buffer se
  mantiene en orden cronológico, que es lo que asume el `sort` al anexar.

`messages` está en la publicación `supabase_realtime` y con `REPLICA IDENTITY
FULL`. Lo pone [supabase_fix_chat.sql](supabase_fix_chat.sql).

Pasados los 100, lo anterior no se carga: **no hay paginación hacia atrás**.
Haría falta un `range()` disparado al llegar arriba del scroll.

---

## No leídos y acuses

El contador vive en `user_chats`. Al enviar, tu lado se pone a 0 con un upsert y
el del otro sube con el RPC **`bump_unread`**: RLS no te deja escribir en la fila
de otro usuario, y por eso hace falta una función.

Nada de esto corre con un contacto manual. `user_chats` guarda ids de usuario y
el contador es del otro lado; sin otro lado, ambas llamadas fallarían por tipo.

Los mensajes llevan `status`: `sent` → `delivered` → `read`. La política
`messages_update_participants` deja que cualquiera de los dos participantes los
actualice
([supabase_update_messages_rls.sql](supabase_update_messages_rls.sql)).

`markMessagesAsDelivered` y `markMessagesAsRead` filtran por `chat_id`, por
estado y **por remitente** (`.neq('sender_id', userId)`). Ese último filtro es
lo que hace que el acuse signifique algo: la política deja actualizar cualquier
mensaje del chat, así que sin él se marcaban también los propios salientes y el
doble visto aparecía sin que el otro hubiera leído nada.

---

## Avisos

Cuando entra un mensaje y la pestaña lo permite, se lanza una **notificación del
navegador** (`Notification`, si hay permiso) además del toast dentro de la app.

Eso **no son notificaciones push**: solo funciona con la app abierta. No hay FCM
ni ningún servicio de push, ni avisos por correo. Está en la lista de
[ESTADO-FUNCIONALIDADES.md](ESTADO-FUNCIONALIDADES.md#lo-que-no-hay).

---

## Lo que NO hay

- **Push.** Ver arriba.
- **Búsqueda por nombre.** Solo por correo o celular exacto.
- **Acceso a la agenda del teléfono.**
- **Bloquear a alguien.**
- **Grupos sincronizados.** Los grupos y sus mensajes se guardan en
  `localStorage` (`worky_chat_groups`, `worky_group_messages`): son de ese
  teléfono y ese navegador, y nadie más los ve. `GroupsManager` y
  `GroupChatWindow` no tocan Supabase.

---

## Piezas

| Archivo | Qué hace |
|---|---|
| [services/messagingService.ts](services/messagingService.ts) | Todo lo de arriba |
| [supabase_fix_chat.sql](supabase_fix_chat.sql) | `recipient_id`, RLS de `messages`, Realtime |
| [supabase_mensajes_a_contactos_manuales.sql](supabase_mensajes_a_contactos_manuales.sql) | `recipient_contact` |
| [supabase_contactos_ficha_inversa.sql](supabase_contactos_ficha_inversa.sql) | Que se creen las dos fichas |
| [supabase_contacts_rls.sql](supabase_contacts_rls.sql) · [supabase_delete_contact_cascade.sql](supabase_delete_contact_cascade.sql) | Políticas de `contacts` |
| [supabase_update_messages_rls.sql](supabase_update_messages_rls.sql) · [supabase_delete_messages_rls.sql](supabase_delete_messages_rls.sql) | Editar y borrar mensajes |
