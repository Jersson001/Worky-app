# Seguridad de la base de datos

Auditoría del 28 de agosto de 2026, hecha antes de activar las sesiones
anónimas. Se encontraron y cerraron tres agujeros, **todos anteriores a ese
cambio**: activar las anónimas no los creó, los habría empeorado.

Los tres se verificaron atacándolos de verdad contra el servidor, no leyendo la
lista de políticas. Esa distinción importó: en un momento dimos por bloqueada
una operación que en realidad se había rechazado por otro motivo (un id que no
era un UUID válido), y hubo que repetir la prueba.

---

## 1. Cualquiera podía nombrarse administrador

**Gravedad: alta. No llegó a usarse** (17 perfiles, 0 admins al comprobarlo).

`protect_subscription_fields` impide ponerse `is_admin` o `is_pro`, pero estaba
declarado solo `BEFORE UPDATE`.

Eso bastaría si la fila del perfil existiera siempre al llegar el usuario. No
existe: **no hay ningún trigger en `auth.users`**. Los comentarios del cliente
dan por hecho un `on_auth_user_created` que cree la fila mínima, y
[supabase_signup_trigger.sql](supabase_signup_trigger.sql) está en el repo, pero
nunca llegó a la base. La primera fila la crea el propio cliente con un upsert,
que para un usuario nuevo es un INSERT.

Resultado: bastaba registrarse y llamar a la API directamente —sin pasar por la
app— con `is_admin: true`. Y un admin lee y modifica el perfil de todos.

**Arreglo:** el trigger pasa a `BEFORE INSERT OR UPDATE`. En el INSERT no hay
`OLD` contra el que comparar, así que se imponen los valores por defecto. Un
admin de verdad sigue pudiendo conceder Pro y nombrar admins.

[supabase_no_autoascenderse.sql](supabase_no_autoascenderse.sql) ·
[pruebas](supabase_no_autoascenderse.test.mjs)

---

## 2. El bucket `files` aceptaba subidas de cualquiera

**Gravedad: alta.**

Quedaron vivas las políticas de diagnóstico de una investigación vieja del
catálogo:

```
Catalogo: prueba publica    INSERT  to public          <- sin cuenta siquiera
Catalogo: prueba carpeta    INSERT  to authenticated   <- cualquier cuenta
```

La primera tenía rol `public`. Con la clave `anon` —que viaja dentro de la app
publicada y por tanto es pública— cualquiera podía subir lo que quisiera.

[supabase_catalogo_storage.sql](supabase_catalogo_storage.sql) ya intentaba
borrarlas en su punto 2, pero no llegó a ejecutarse entero.

**Arreglo:** se cierra el bucket completo. Ya no se usa: la única función que
escribía ahí es `uploadFile` en `services/storageService.ts` y no la llama nadie.
Lo ya subido se sigue leyendo, porque los buckets públicos sirven las descargas
por URL sin pasar por estas políticas.

[supabase_cerrar_bucket_files.sql](supabase_cerrar_bucket_files.sql)

---

## 3. Se podía sobrescribir el catálogo de otro

**Gravedad: alta.**

Las políticas de `chat_media` solo comprobaban el bucket, no de quién era cada
archivo:

```sql
USING (bucket_id = 'chat_media')
```

Cualquier usuario con sesión podía sobrescribir el archivo de cualquier otro. Lo
más grave era el catálogo: es el HTML que la app le sirve a quien escanea el QR
de un vendedor, así que reemplazarlo es **suplantarlo delante de sus clientes**.

**Arreglo:** fuera la política de UPDATE —ya no hacía falta, porque el catálogo
estrena nombre en cada publicación—, el INSERT exige que la carpeta sea la tuya,
y se añade DELETE, que no existía: nadie podía borrar ni sus propias fotos.

[supabase_storage_por_dueno.sql](supabase_storage_por_dueno.sql) ·
[pruebas](supabase_storage_por_dueno.test.mjs)

---

## Límites de las cuentas anónimas

Un usuario anónimo usa el rol `authenticated`, así que las políticas existentes
—todas del tipo `auth.uid() = user_id`— le dejan hacer lo mismo que a un
vendedor. Para casi todo está bien: viene a escribir y a mandar fotos.

Dos cosas de vendedor sí se le cierran, porque su cuenta se crea sin correo y sin
dejar rastro:

| | |
|---|---|
| **Publicar catálogos** | Es HTML servido desde tu dominio de Supabase. Sin el límite, alguien podría crear cuentas anónimas en masa y alojar páginas de phishing. |
| **Crear productos** | Puerta a llenar la base y el almacenamiento sin que haya a quién reclamarle. |

El límite del catálogo mira **solo** la carpeta `shared_catalogs`, para no
bloquear de rebote las fotos que el cliente manda por el chat. Es el error fácil
de cometer aquí y las pruebas lo comprueban explícitamente.

Se usa `coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false` y no
`is false` a secas, que es lo que trae la documentación de Supabase: si el token
llegara sin la marca, `is false` daría NULL y **bloquearía a un usuario normal**.

[supabase_limites_anonimos.sql](supabase_limites_anonimos.sql) ·
[pruebas](supabase_limites_anonimos.test.mjs)

---

## Estado al cerrar la auditoría

Políticas de escritura sobre Storage:

| Política | cmd | Alcance |
|---|---|---|
| chat_media: subir a lo propio | INSERT | por dueño |
| chat_media: borrar lo propio | DELETE | por dueño |
| Permitir lectura publica de chat_media | SELECT | público *(a propósito)* |
| Solo cuentas permanentes publican catalogo | INSERT | restrictiva |

Ninguna política de UPDATE. Ninguna sobre `files`. Todas las tablas de `public`
tienen RLS activado.

Ataque final, ejecutado con una cuenta anónima real contra el servidor:

```
crear un producto           BLOQUEADO
publicar un catalogo        BLOQUEADO
escribir en carpeta ajena   BLOQUEADO
subir al bucket files       BLOQUEADO
nombrarse admin             is_admin=false, is_pro=false
mandar foto por el chat     PERMITIDO   <- lo que sí debe poder
```

---

## Restos conocidos

- **`shared_docs/<id>` no lleva el dueño en la ruta**, así que ahí solo se puede
  exigir la carpeta. Sobrescribir ya no es posible y los nombres llevan marca de
  tiempo y azar, pero alguien podría subir basura. Cerrarlo del todo obliga a
  mover la ruta a `shared_docs/<uid>/<id>`, y eso rompe los enlaces ya repartidos.
- **4 cuentas en `auth.users` sin perfil**, por el trigger que nunca se instaló.
  No es urgente: el cliente crea el perfil al entrar.
- **Dos versiones de `add_contact_mutual`** conviven en la base (6 y 7
  parámetros). La app usa la de 7. Convendría retirar la otra.

---

## Cómo repetir la auditoría

```sql
-- Escrituras que no comprueban de quién es la fila
select schemaname||'.'||tablename as tabla, policyname, cmd, roles::text
from pg_policies
where cmd in ('INSERT','UPDATE','DELETE','ALL')
  and permissive = 'PERMISSIVE'
  and coalesce(qual, with_check, 'true') not like '%auth.uid()%'
  and coalesce(qual, with_check, 'true') not like '%auth.jwt()%';

-- Tablas sin RLS: quedan abiertas de par en par
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;
```

Ojo con lo que aparezca marcado como **«prueba», «test» o «diagnóstico»**: suele
ser un permiso temporal que nadie retiró. Así estaba el agujero número 2.

Las pruebas `.test.mjs` corren contra un Postgres de verdad (PGlite, en memoria)
sin tocar producción:

```bash
npm install @electric-sql/pglite --no-save
node supabase_alias.test.mjs
```

**Que copien el esquema real, con sus restricciones.** Una de estas pruebas dio
verde a una función que fallaba en producción porque su tabla simulada dejaba
`phone_or_email` nullable y la de verdad es `NOT NULL`.
