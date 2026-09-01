# Guía de despliegue

Última revisión: 1 de septiembre de 2026.

> Esta guía explicaba cómo configurar Firebase Console, sus reglas de Realtime
> Database y una clave de Gemini. El backend es Supabase desde la migración y la
> IA se retiró, así que no quedaba nada aprovechable. Se reescribió entera.

De aquí sale una app funcionando en tres sitios: local, web (Vercel) y Android.

---

## 1. Supabase

### 1.1 El proyecto

En [supabase.com](https://supabase.com) hace falta un proyecto con la base
Postgres. De **Project Settings → API** se copian dos valores:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public key** → `VITE_SUPABASE_ANON_KEY`

La clave `anon` viaja dentro de la app publicada, así que **es pública**. Lo que
protege los datos es RLS, no esa clave. Nunca uses aquí la `service_role`.

### 1.2 Autenticación

En **Authentication → Providers**:

- **Email**: activado. Y `Confirm email` **desactivado** — así el registro entra
  de una, sin pasar por la bandeja de correo.
- **Anonymous sign-ins**: activado. Es lo que sostiene el atajo por alias, con el
  que un cliente entra al chat sin correo ni celular.

No hay proveedor de SMS ni de enlace mágico: no se usan.

Antes de activar las anónimas conviene leer los límites que se les pusieron en
[SEGURIDAD.md](SEGURIDAD.md#límites-de-las-cuentas-anónimas): no pueden publicar
catálogos ni crear productos.

### 1.3 El esquema

Los `.sql` de la raíz son migraciones para pegar en el **SQL Editor**. Todos son
idempotentes: correrlos dos veces no rompe nada.

En una base nueva, el orden que importa es este; el resto puede ir después.

| # | Archivo | Qué deja |
|---|---|---|
| 1 | `supabase_subscriptions.sql` | `is_pro`, `trial_ends_at`, `subscription_ends_at` |
| 2 | `supabase_admin_panel.sql` | `is_admin` y sus políticas |
| 3 | `supabase_no_autoascenderse.sql` | Que nadie se ponga `is_admin` por su cuenta |
| 4 | `supabase_fix_chat.sql` | `recipient_id`, RLS de `messages`, Realtime |
| 5 | `supabase_mensajes_a_contactos_manuales.sql` | `recipient_contact` |
| 6 | `supabase_contacts_rls.sql` · `supabase_contacts_fix_fk.sql` · `supabase_contacts_email.sql` · `supabase_contacts_alias_and_anchor.sql` | Tabla `contacts` |
| 7 | `supabase_contacts_mutual_rpc.sql` · `supabase_contactos_ficha_inversa.sql` | Que agregar cree las **dos** fichas |
| 8 | `supabase_alias.sql` | `sugerir_alias()` y `reservar_alias()` |
| 9 | `supabase_projects_double_way.sql` · `supabase_projects_schema_cache_fix.sql` | Proyectos |
| 10 | `supabase_chat_media_storage.sql` · `supabase_storage_por_dueno.sql` | Bucket `chat_media`, cada uno en su carpeta |
| 11 | `supabase_cerrar_bucket_files.sql` | Cierra el bucket `files` |
| 12 | `supabase_limites_anonimos.sql` | Límites de las cuentas anónimas |

El paso **3** y los **10–12** son los tres agujeros que cerró la auditoría. No
son opcionales.

Los que faltan de la lista —`supabase_update_messages_rls.sql`,
`supabase_delete_messages_rls.sql`, `supabase_delete_contact_cascade.sql` y
`supabase_contacts_manual_leads_fix.sql`— añaden permisos sueltos (editar y
borrar mensajes, borrar contactos) y pueden ir en cualquier momento después.

`supabase_signup_trigger.sql` está en el repo pero **nunca llegó a la base**: el
perfil lo crea el cliente al entrar. Si lo instalas, comprueba que no choque con
ese upsert.

Si PostgREST se queda con el esquema viejo (`column ... does not exist` sobre una
columna que sí existe):

```sql
NOTIFY pgrst, 'reload schema';
```

### 1.4 Comprobar que quedó bien

Estas dos consultas son el resumen de la auditoría; deberían salir vacías:

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

Ojo con las políticas que digan «prueba», «test» o «diagnóstico»: suelen ser
permisos temporales que nadie retiró. Así estaba el segundo agujero.

---

## 2. Local

```bash
npm install
cp env.example .env.local     # y rellena las dos variables
npm run dev
```

Vite carga `.env.local` con prioridad sobre `.env`. Si faltan las credenciales,
la consola lo dice al arrancar; no hay que adivinarlo por los errores de red.

Las pruebas de los `.sql` corren contra un Postgres de verdad (PGlite, en
memoria) sin tocar producción:

```bash
npm install @electric-sql/pglite --no-save
node supabase_alias.test.mjs
```

Hay pruebas para `supabase_alias`, `supabase_no_autoascenderse`,
`supabase_storage_por_dueno` y `supabase_limites_anonimos`.

---

## 3. Web

`npm run build` deja el sitio estático en `dist/`, que vale para cualquier
hosting. Hoy está en Vercel: <https://worky-app-khaki.vercel.app>.

Las dos variables `VITE_*` hay que declararlas también en el hosting. Vite las
mete en el bundle **en tiempo de compilación**: si no están al compilar, no
aparecen luego por ponerlas después.

Los enlaces y QR que genera la app **se adaptan al sitio**. Desde un preview de
Vercel apuntan al preview, lo que permite probar el recorrido del QR antes de
publicar; desde `localhost` o el APK apuntan a la app publicada, porque un QR con
`localhost` no lleva a ninguna parte.

---

## 4. Android

```bash
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
```

O de una vez: `npm run bundle:release`.

Hace falta `android/keystore.properties` con las contraseñas de firma; hay
plantilla en `keystore.properties.example`. Sin ese archivo Gradle falla a
propósito, con un mensaje que dice qué falta — antes firmaba con nulos y el error
no decía de qué iba.

Ese archivo y el `.jks` **no se versionan**.

El AAB queda en `android/app/build/outputs/bundle/release/app-release.aab`.

Para publicar en Play, incluida la razón por la que rechazaron la 2.1:
[GUIA-GOOGLE-PLAY-STORE.md](GUIA-GOOGLE-PLAY-STORE.md). Para generar un APK de
pruebas: [GENERAR-APK-ANDROID-STUDIO.md](GENERAR-APK-ANDROID-STUDIO.md).

No hay `google-services.json` ni hace falta: era de Firebase. Gradle solo aplica
el plugin si el archivo existe.

---

## 5. Antes de dar por buena una versión

- [ ] Las dos variables `VITE_*` están en el hosting **y** el build es posterior
- [ ] Registrarse, entrar y que aparezca el onboarding
- [ ] Entrar por alias, sin correo ni celular
- [ ] Agregar un contacto y comprobar que **al otro también le aparece**
- [ ] Mandar un mensaje y una foto; que lleguen sin recargar
- [ ] Publicar el catálogo **dos veces** y abrir el QR en una ventana privada
- [ ] Mandar una cotización por WhatsApp y abrir su enlace desde otro teléfono
- [ ] Imprimir una cotización y que no se corte por la derecha
- [ ] Las dos consultas de seguridad del punto 1.4, vacías

---

## Si algo falla

**«new row violates row-level security policy»** al subir un archivo. Es el
bucket: `files` está cerrado y no acepta escrituras. Todo va a `chat_media`, y
cada uno solo escribe en su carpeta.

**El QR muestra código fuente.** Está apuntando al objeto de Storage en vez de a
la app. El enlace bueno es `?catalogo=<userId>`; el porqué, en
[PENDIENTE-CATALOGO-STORAGE.md](PENDIENTE-CATALOGO-STORAGE.md).

**`cannot add ... after subscribe()`.** Ya está resuelto con `uniqueTopic()` en
`supabaseConfig.ts`. No necesita SQL.

**Una foto de móvil no se sube** y devuelve el error 57014 de Postgres. Es el
tiempo máximo de escritura: las fotos se reducen antes de subirlas, y ese camino
se lo está saltando algo.

**Agregas un contacto y al otro no le aparece.** Falta
`supabase_contactos_ficha_inversa.sql`, o hay dos versiones de
`add_contact_mutual` conviviendo y se está llamando la de 6 parámetros. La app
usa la de 7.
