# Notas de la migración a Supabase

Última revisión: 1 de septiembre de 2026.

> Este documento era una lista de tareas de mitad de la migración: nueve SQL
> «pendientes de ejecutar», 39 archivos sin commitear y tres opciones de `git
> stash`. Todo eso se resolvió hace meses. Se reescribió como lo que hoy sirve:
> qué cambió al pasar de Firebase a Supabase y qué costuras quedaron.

Para montar una base desde cero, el orden de los `.sql` está en
[GUIA-PRODUCCION.md](GUIA-PRODUCCION.md#13-el-esquema). Esto es el porqué.

---

## Qué cambió

| Antes (Firebase) | Ahora (Supabase) |
|---|---|
| Realtime Database, árbol JSON | Postgres con tablas y RLS |
| Reglas `.read` / `.write` en JSON | Políticas RLS por fila |
| Authentication con SMS y enlace mágico | Correo y contraseña, más sesiones anónimas |
| Firebase Storage | Storage de Supabase, bucket `chat_media` |
| Adjuntos en base64 dentro del mensaje | Archivos en Storage, en el mensaje va la URL |
| `userIndex/` con claves escapadas | Tabla `public_info`, de lectura pública |
| Cloud Functions | Edge Functions (dos, ambas hoy sin uso) |

Los adjuntos en base64 no eran un detalle: una foto de móvil son unos 10 MB y la
escritura se pasaba del tiempo máximo. De ahí que ahora las fotos **se reduzcan
antes de subirlas**, con el error 57014 de Postgres como recuerdo.

---

## Lo que la migración no arrastró

Se quedaron por el camino, y no por descuido:

- **El login por SMS.** No lo llamaba nadie y hacía creer que agregar contactos
  por celular costaba una suscripción de SMS. No cuesta nada.
- **Las descripciones de producto con IA.** Ver [CATALOGO-IA.md](CATALOGO-IA.md).
- **El trigger `on_auth_user_created`.** Está en
  [supabase_signup_trigger.sql](supabase_signup_trigger.sql) pero **nunca llegó a
  la base**: el perfil lo crea el cliente con un upsert al entrar. Eso abrió el
  agujero de los admins, porque `protect_subscription_fields` solo cubría
  `BEFORE UPDATE` y la primera fila entra por INSERT. Está contado en
  [SEGURIDAD.md](SEGURIDAD.md).

---

## Costuras que siguen ahí

**El código dice «Firebase» y quiere decir Supabase.** `sendMessageToFirebase`,
`firebaseContacts`, `firebaseMessages`, comentarios sueltos y un import comentado
de `FirebaseConnectionTest`. Son nombres heredados; por debajo no queda nada de
Firebase (`firebase` no está en `package.json`).

**`user_index` sobrevive por compatibilidad.** Las cuentas registradas antes del
trigger que llena `public_info` solo están ahí, con las claves escapadas al
estilo Firebase. `searchUserByPhoneOrEmail` la consulta como tercer intento, tras
fallar los dos de `public_info`.

**El respaldo de `addContact`.** Cuando el RPC `add_contact_mutual` falla, se
inserta directo en `contacts`. Ese camino solo crea **tu** ficha, no la del otro:
es red de seguridad, no equivalente. Y reintenta sin las columnas `alias` y
`email` si la base todavía no las tiene, antes que perder el contacto por una
columna que falta.

**Dos versiones de `add_contact_mutual`** conviven en la base, de 6 y 7
parámetros. La app usa la de 7. Convendría retirar la otra.

**Contactos manuales con id `lead_<uuid>`**, que no son uuid válidos y chocan con
`contacts.id` y `projects.contact_id`. Sigue pendiente.

**`saveProject` manda columnas que no existen** (`quote_code`, `contractor_id`,
`client_id`, `metadata`) y además se traga el error con un `return`. El SQL está
dado; falta ejecutarlo.

Las dos últimas están detalladas en
[PENDIENTE-CATALOGO-STORAGE.md](PENDIENTE-CATALOGO-STORAGE.md).

---

## Cómo se prueban las migraciones

Los `.sql` que llevan un `.test.mjs` al lado se prueban contra un Postgres de
verdad (PGlite, en memoria) sin tocar producción:

```bash
npm install @electric-sql/pglite --no-save
node supabase_alias.test.mjs
```

Hay pruebas para `supabase_alias`, `supabase_no_autoascenderse`,
`supabase_storage_por_dueno` y `supabase_limites_anonimos`.

**Que copien el esquema real, con sus restricciones.** Una de estas pruebas dio
verde a una función que fallaba en producción porque su tabla simulada dejaba
`phone_or_email` nullable y la de verdad es `NOT NULL`.

---

## Si PostgREST se queda con el esquema viejo

Síntoma: `column ... does not exist` sobre una columna que sí está.

```sql
NOTIFY pgrst, 'reload schema';
```

Todos los `.sql` de la raíz terminan con esa línea. Espera un par de segundos y
recarga la app.
