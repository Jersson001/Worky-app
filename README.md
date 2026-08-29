# Worky

App de gestión para emprendedores: chat con clientes, catálogo de productos,
cotizaciones y facturas, y control de proyectos y gastos.

React + TypeScript + Vite sobre Supabase, empaquetada para Android con Capacitor.

## Arrancar en local

Requisitos: Node.js.

```bash
npm install
npm run dev
```

Las claves van en `.env.local`; hay una plantilla en
[.env.local.example](.env.local.example).

## Documentación

| | |
|---|---|
| [ESTADO-FUNCIONALIDADES.md](ESTADO-FUNCIONALIDADES.md) | Qué funciona hoy y qué no. **Empieza por aquí.** |
| [SEGURIDAD.md](SEGURIDAD.md) | Auditoría de las políticas de la base, agujeros cerrados y cómo repetirla |
| [COMO-FUNCIONA-EL-CHAT.md](COMO-FUNCIONA-EL-CHAT.md) | Mensajería, contactos manuales |
| [PENDIENTE-CATALOGO-STORAGE.md](PENDIENTE-CATALOGO-STORAGE.md) | Por qué la página del catálogo la sirve la app y no Storage |
| [IDEAS-CATALOGO.md](IDEAS-CATALOGO.md) | Ideas pendientes para el catálogo |
| [GUIA-GOOGLE-PLAY-STORE.md](GUIA-GOOGLE-PLAY-STORE.md) | Publicar en Play Store. **Incluye por qué rechazaron la 2.1.** |
| [GENERAR-APK-ANDROID-STUDIO.md](GENERAR-APK-ANDROID-STUDIO.md) | Generar el APK |
| [GUIA-PRODUCCION.md](GUIA-PRODUCCION.md) | Despliegue |
| [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | Notas de la migración a Supabase |

## Base de datos

Los `.sql` de la raíz son migraciones para pegar en el SQL Editor de Supabase.
Todos son idempotentes: correrlos dos veces no rompe nada.

Los que llevan `.test.mjs` al lado tienen pruebas que corren contra un Postgres
de verdad (PGlite, en memoria) sin tocar producción:

```bash
npm install @electric-sql/pglite --no-save
node supabase_alias.test.mjs
```

## Android

```bash
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
```

Los iconos se regeneran desde `assets/` con
`npx @capacitor/assets generate --android`.
