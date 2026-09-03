# Worky

App de gestión para emprendedores: chat con clientes, catálogo de productos,
cotizaciones y facturas, y control de proyectos y gastos.

React + TypeScript + Vite sobre Supabase, empaquetada para Android con Capacitor.

La publica **Ferry App S.A.S.** (NIT 902.028.115-2). Sus datos legales viven en
[utils/legal.ts](utils/legal.ts), y la política de privacidad y los términos en
`public/`, de donde Vite los copia al build y Capacitor los empaqueta.

## Arrancar en local

Requisitos: Node.js.

```bash
npm install
npm run dev
```

Las claves van en `.env.local` —son dos, la URL y la clave `anon` de Supabase—;
hay una plantilla en [env.example](env.example).

## Documentación

| | |
|---|---|
| [ESTADO-FUNCIONALIDADES.md](ESTADO-FUNCIONALIDADES.md) | Qué funciona hoy y qué no. **Empieza por aquí.** Cómo se arman las cotizaciones por capítulos, qué ve cada oficio, y por qué el documento se imprime como se imprime |
| [SEGURIDAD.md](SEGURIDAD.md) | Auditoría de las políticas de la base, agujeros cerrados y cómo repetirla |
| [PREVIEW-PROYECTO.md](PREVIEW-PROYECTO.md) | Mapa del repositorio: stack, estructura, tablas y rutas públicas |
| [COMO-FUNCIONA-EL-CHAT.md](COMO-FUNCIONA-EL-CHAT.md) | Mensajería, contactos manuales, tiempo real |
| [PENDIENTE-CATALOGO-STORAGE.md](PENDIENTE-CATALOGO-STORAGE.md) | Por qué la página del catálogo la sirve la app y no Storage |
| [IDEAS-CATALOGO.md](IDEAS-CATALOGO.md) | Ideas pendientes para el catálogo |
| [INTEGRACION-WHATSAPP.md](INTEGRACION-WHATSAPP.md) | Cómo se comparten documentos por WhatsApp |
| [GUIA-PRODUCCION.md](GUIA-PRODUCCION.md) | Montar Supabase y desplegar en web y Android |
| [GUIA-GOOGLE-PLAY-STORE.md](GUIA-GOOGLE-PLAY-STORE.md) | Publicar en Play Store. **Incluye por qué rechazaron la 2.1 y la 16.** |
| [GENERAR-APK-ANDROID-STUDIO.md](GENERAR-APK-ANDROID-STUDIO.md) | Generar el APK |
| [CHECKLIST-EMPRENDEDOR.md](CHECKLIST-EMPRENDEDOR.md) | Qué dejar hecho para usar la app en un negocio real |
| [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) | Qué cambió al pasar de Firebase a Supabase y qué costuras quedaron |
| [CATALOGO-IA.md](CATALOGO-IA.md) | Las descripciones con IA: qué hacían y por qué se retiraron |

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
