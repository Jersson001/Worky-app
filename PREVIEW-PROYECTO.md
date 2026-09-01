# Vista general del proyecto

Última revisión: 1 de septiembre de 2026.

> Este documento describía la app sobre Firebase (Authentication, Realtime
> Database, Storage) y con Gemini analizando las fotos del catálogo. Nada de eso
> sigue en el proyecto: `firebase` no está en `package.json` y la IA se retiró.
> Se reescribió comprobando cada punto contra el código.

Para **qué funciona y qué no**, el documento de referencia es
[ESTADO-FUNCIONALIDADES.md](ESTADO-FUNCIONALIDADES.md). Este es el mapa del
repositorio: dónde está cada cosa.

---

## Stack

| Capa | Qué |
|---|---|
| UI | React 19 + TypeScript 5.8, compilado con Vite 6 |
| Estilos | Tailwind y Font Awesome **desde CDN**, en `index.html`, con una paleta de variables CSS propia |
| Backend | Supabase: Postgres con RLS, Auth, Realtime y Storage (`@supabase/supabase-js` v2) |
| Móvil | Capacitor 8, solo Android |

Las únicas dependencias de producción son `react`, `react-dom`,
`@supabase/supabase-js` y los paquetes de Capacitor.

`index.html` carga también `html2pdf` por CDN y trae un `importmap` de React
heredado de AI Studio, que no hace falta porque Vite ya empaqueta React.

---

## Estructura

```
worky_app/
├── App.tsx                  # Componente raíz: estado, efectos y casi toda la lógica de pantalla
├── index.tsx                # Entrada. Resuelve `?catalogo=` ANTES de montar la app
├── types.ts                 # Contact, Message, Project, Product, Story, ChatGroup…
│
├── components/
│   ├── LoginScreen.tsx       # Registro, acceso y el atajo por alias
│   ├── WelcomeOnboarding.tsx # Negocio, oficio y logo. El oficio decide los capítulos de cotización
│   ├── ChatList.tsx · ChatWindow.tsx
│   ├── chat/                 # Cabecera, lista, burbujas, pie y modales del chat
│   ├── QuoteDocument.tsx     # Cotizaciones, facturas, recibos y cuentas de cobro
│   ├── ContractGenerator.tsx · SignaturePad.tsx
│   ├── CatalogShareModal.tsx · catalogoPublico.ts  # Publicar y pintar el catálogo
│   ├── SharedDocumentViewer.tsx                    # Ruta `?view=`, sin sesión
│   ├── ProjectBoard.tsx · GanttChart.tsx
│   ├── FinancialReport.tsx · WalletModal.tsx
│   ├── GroupsManager.tsx · GroupChatWindow.tsx     # Solo localStorage
│   ├── StatusView.tsx                              # Historias, solo localStorage
│   ├── AdminPanel.tsx · ProFeatureGuard.tsx
│   ├── ProfileEditor.tsx · UserSearchModal.tsx · NotificationsPanel.tsx
│   └── Sidebar.tsx · ErrorBoundary.tsx
│
├── services/
│   ├── supabaseConfig.ts     # Cliente, PUBLIC_BUCKET y uniqueTopic
│   ├── messagingService.ts   # Contactos, mensajes, Realtime, no leídos
│   ├── dataService.ts        # Productos, categorías, proyectos, gastos, cuentas
│   ├── storageService.ts     # Subidas a Storage
│   ├── catalogShareService.ts# Instantánea HTML del catálogo, QR y enlaces
│   ├── whatsappService.ts    # Documentos compartidos y enlaces de WhatsApp
│   ├── documentHtml.ts       # HTML maquetado de los documentos
│   ├── adminService.ts       # Panel de admin: Pro y prueba
│   └── geminiService.ts      # Muerto: no lo importa nadie
│
├── hooks/          useChatFormState.ts · useFileUpload.ts
├── utils/          currency · imagen · id · errorMessage · carpentryCalculations · taxCalculations
├── supabase/       functions/ (gemini, view-doc — ambas sin uso) y migrations/
├── android/        Proyecto Capacitor
└── *.sql           Migraciones para el SQL Editor, idempotentes
```

`App.tsx` conserva dos constantes `MOCK_CONTACTS` y `MOCK_STORIES` que **no las
usa nadie**: son resto de la demo original, no un modo de datos falsos.

---

## Modelo de datos

Tablas de `public` que toca la app:

| Tabla | Para qué |
|---|---|
| `user_profiles` | El negocio: nombre, dueño, logo, `is_admin`, `is_pro`, `trial_ends_at` |
| `public_info` | Índice público: `user_id`, `phone_or_email`, nombre y avatar. **Lectura pública** |
| `user_index` | Índice viejo con claves escapadas al estilo Firebase. Solo compatibilidad |
| `contacts` | Clientes, proveedores y colaboradores. `contact_user_id` es `NULL` en los contactos manuales |
| `messages` | Todos los mensajes, agrupados por `chat_id` |
| `user_chats` | Último mensaje y contador de no leídos por conversación |
| `products` · `categories` | Catálogo |
| `projects` · `expenses` | Proyectos y sus gastos |
| `payment_accounts` | Cuentas bancarias propias y de terceros |

Todas tienen RLS activado. Las políticas se auditaron el 28 de agosto de 2026:
[SEGURIDAD.md](SEGURIDAD.md).

Funciones que llama la app: `add_contact_mutual`, `bump_unread`,
`sugerir_alias` y `reservar_alias`.

### Storage

Todo en el bucket `chat_media`. El bucket `files` está cerrado.

| Qué | Ruta |
|---|---|
| Fotos y adjuntos del chat | `<uid>/<contacto>/<archivo>` |
| Fotos de producto | `<uid>/<carpeta>/<archivo>` |
| Catálogos publicados | `shared_catalogs/<uid>/<fecha>.html` |
| Documentos compartidos | `shared_docs/<id>.json` y `.html` |

### Lo que no se sincroniza

Grupos, mensajes de grupo e historias viven **solo en `localStorage`**
(`worky_chat_groups`, `worky_group_messages`, `worky_user_stories`). Son de ese
teléfono y ese navegador: no se comparten, no se respaldan y se pierden al
borrar los datos de la app.

---

## Rutas públicas

Tres recorridos funcionan **sin sesión**, y por eso se resuelven antes de que
aparezca el login:

| URL | Qué hace |
|---|---|
| `?catalogo=<userId>` | Pinta el catálogo del vendedor. Se resuelve en `index.tsx`, antes de montar la app |
| `?view=<documentId>` | Enseña una cotización o factura compartida |
| `?vendedor=<userId>` | Guarda con quién quiere hablar quien viene del QR, y le abre ese chat al entrar |

Supabase sirve todo HTML público de Storage como `text/plain` con `nosniff`, así
que **la página la pinta la app**, no Storage. El porqué está en
[PENDIENTE-CATALOGO-STORAGE.md](PENDIENTE-CATALOGO-STORAGE.md).

Y la pinta de verdad: `catalogoPublico.ts` **lee** la instantánea con
`DOMParser` y construye la página a mano. No hay iframe. Ese HTML nunca se
ejecuta, solo se interpreta su estructura, que es lo que permite el «me gusta»
sobre cada foto sin darle permisos a contenido publicado por un usuario.

---

## Autenticación

Correo y contraseña (`signUp` / `signInWithPassword`) y sesiones anónimas
(`signInAnonymously`) para el atajo por alias. **No hay** login por SMS ni enlace
mágico: el código de verificación por SMS se retiró.

`Confirm email` está desactivado en Supabase, así que al registrarse se entra de
una.

---

## Configuración

Dos variables, ambas en `.env.local`; la plantilla es
[env.example](env.example):

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Sin ellas la app arranca igual y falla después con errores de red poco claros,
así que `supabaseConfig.ts` avisa por consola al cargar.

Los pasos de despliegue están en [GUIA-PRODUCCION.md](GUIA-PRODUCCION.md).

---

## Deuda conocida

- **El código sigue diciendo «Firebase».** `sendMessageToFirebase`,
  `firebaseContacts`, comentarios sueltos y un import comentado de
  `FirebaseConnectionTest`. Son nombres heredados: por debajo todo es Supabase.
- **`services/geminiService.ts` y `supabase/functions/gemini/` no los usa nadie**
  desde que se retiraron las descripciones con IA. Ver [CATALOGO-IA.md](CATALOGO-IA.md).
- **`supabase/functions/view-doc/`** quedó sin uso cuando `?view=` pasó a leer el
  JSON directamente.
- **`App.tsx` pasa de 3.700 líneas** y concentra casi todo el estado.
- **`App.backup.tsx` y `App.minimal.tsx`** siguen en la raíz.
- **CSS muerto en la instantánea del catálogo.** `catalogShareService.ts` sigue
  generando `details` para las carpetas, el visor `:target` y la galería de
  miniaturas. Eran para que la página funcionara dentro del iframe; desde que la
  pinta la app, ese HTML solo se lee. No estorban —describen la estructura que
  el visor interpreta— pero se pueden limpiar.
- **`saveProject` se traga los errores** con un `return`, así que un fallo de
  guardado no llega a la pantalla.
