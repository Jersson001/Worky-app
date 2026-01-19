# 📱 Worky App - Vista Previa del Proyecto

## 🎯 Descripción General

**Worky** es una aplicación móvil y web para la gestión integral de proyectos artesanales y de carpintería. Permite gestionar clientes, proyectos, cotizaciones, facturas, gastos y comunicación en tiempo real.

---

## 🛠️ Stack Tecnológico

### Frontend
- **React 19.2.0** - Framework UI
- **TypeScript 5.8.2** - Lenguaje tipado
- **Vite 6.2.0** - Build tool y dev server
- **Tailwind CSS** - Estilos (inferido del código)

### Backend & Servicios
- **Firebase 12.7.0** - Backend as a Service
  - Authentication (Email/Phone)
  - Realtime Database
  - Storage
- **Google Gemini AI (Gemini 2.5 Flash)** - Inteligencia Artificial
  - Generación de respuestas inteligentes
  - Análisis de imágenes de productos
  - Extracción de datos para facturas

### Mobile
- **Capacitor 8.0** - Framework híbrido
  - Android support
  - Firebase Authentication plugin nativo

---

## 📁 Estructura del Proyecto

```
worky_app/
├── components/              # Componentes React
│   ├── ChatList.tsx        # Lista de chats/contactos
│   ├── ChatWindow.tsx      # Ventana de chat individual
│   ├── FinancialReport.tsx # Reporte financiero
│   ├── LoginScreen.tsx     # Pantalla de login
│   ├── NotificationsPanel.tsx
│   ├── ProjectBoard.tsx
│   ├── QuoteDocument.tsx   # Generación de cotizaciones
│   ├── SignaturePad.tsx    # Firma digital
│   ├── StatusView.tsx      # Historias/Stories
│   ├── WalletModal.tsx     # Gestión de cuentas bancarias
│   └── WelcomeOnboarding.tsx # Onboarding inicial
│
├── services/               # Servicios de negocio
│   ├── authService.ts      # Autenticación Firebase
│   ├── firebaseConfig.ts   # Configuración Firebase
│   ├── geminiService.ts    # Servicios de IA
│   └── messagingService.ts # Mensajería en tiempo real
│
├── android/                # Aplicación Android nativa
│   └── app/               # Código nativo Android
│
├── types.ts               # Definiciones TypeScript
├── App.tsx               # Componente principal
├── index.tsx             # Entry point
├── capacitor.config.ts   # Configuración Capacitor
└── vite.config.ts        # Configuración Vite
```

---

## 🎨 Funcionalidades Principales

### 1. 🔐 Autenticación
- **Login por Email**: Link mágico de Firebase
- **Login por Teléfono**: SMS verification (web + móvil nativo)
- **Onboarding**: Configuración inicial del negocio
  - Nombre del negocio
  - Información del propietario
  - Logo del negocio
  - Tipo de negocio

### 2. 💬 Mensajería
- Chat en tiempo real con Firebase Realtime Database
- Mensajes de texto
- Envío de documentos (cotizaciones, facturas, cuentas de cobro)
- Envío de productos del catálogo
- Receipts de gastos
- Notificaciones de mensajes no leídos

### 3. 👥 Gestión de Contactos
- **Tipos de contacto**:
  - Clientes
  - Proveedores
  - Colaboradores
- Estados: Lead, Cliente Activo, Finalizado, Archivado
- Información de contacto (nombre, teléfono, avatar)
- Historial de proyectos por contacto

### 4. 📊 Gestión de Proyectos
- Múltiples proyectos por cliente
- **Estados del proyecto**:
  - Consulta
  - Propuesta
  - En Progreso
  - Facturación
  - Completado
- Registro de gastos por proyecto
- Seguimiento de valor y fechas

### 5. 📄 Documentos
- **Cotizaciones**: Generación y envío vía chat
- **Facturas**: Creación y seguimiento de pagos
- **Cuentas de Cobro**: Generación de documentos de cobro
- **Registro de Gastos**: Con recibo adjunto
- Firma digital personalizada
- Logo del negocio en documentos

### 6. 🛍️ Catálogo de Productos
- Gestión de productos con imágenes múltiples
- Categorías de productos (carpetas)
- **IA Integrada**:
  - Análisis automático de imágenes
  - Generación de descripciones
  - Sugerencias para mejorar fotos
  - Detección de características
- Stock disponible
- Precios
- Envío directo desde catálogo al chat

### 7. 💰 Gestión Financiera
- Reporte financiero consolidado
- Cuentas bancarias propias (Bancolombia, Nequi, Daviplata)
- Cuentas de terceros (proveedores)
- Envío de datos bancarios vía chat
- Seguimiento de pagos y gastos

### 8. 📸 Historias (Stories)
- Creación de historias temporales
- Texto e imágenes
- Cámara integrada
- Expiración automática

### 9. 📱 Notificaciones
- Panel de notificaciones
- Alertas de mensajes no leídos
- Recordatorios de proyectos

### 10. 📁 Gestión de Documentos Legales
- Subida de PDFs (RUT, Cámara de Comercio, Cédula)
- Organización y categorización
- Vista previa y descarga

---

## 🤖 Inteligencia Artificial (Google Gemini)

### Funcionalidades IA:
1. **Respuestas Inteligentes**: Sugerencias automáticas de respuestas en chats
2. **Análisis de Productos**: 
   - Descripción automática desde imágenes
   - Sugerencias para mejorar fotos
   - Detección de características
3. **Extracción de Datos**: Análisis de conversaciones para generar facturas

---

## 📱 Compatibilidad

- ✅ **Web** (PWA-ready)
- ✅ **Android** (nativo con Capacitor)
- 📱 Diseño responsive (móvil y desktop)

---

## 🔧 Configuración Requerida

### Variables de Entorno:
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
GEMINI_API_KEY=
```

### Scripts Disponibles:
```bash
npm run dev        # Desarrollo local
npm run build      # Build para producción
npm run preview    # Preview del build
npm run android    # Build y abrir Android Studio
```

---

## 🎨 Características de UI/UX

- Diseño moderno y limpio
- Tema oscuro para lista de chats
- Tema claro para contenido principal
- Navegación móvil con tabs inferiores
- Modales y overlays con backdrop blur
- Animaciones suaves
- Iconos Font Awesome
- Gradientes y sombras modernas

---

## 📊 Modelo de Datos

### Entidades Principales:
- **User/Profile**: Información del negocio
- **Contact**: Clientes, proveedores, colaboradores
- **Project**: Proyectos asociados a contactos
- **Expense**: Gastos por proyecto
- **Message**: Mensajes de chat
- **Product**: Productos del catálogo
- **ProductCategory**: Categorías de productos
- **Invoice/Quote/CollectionAccount**: Documentos
- **PaymentAccount**: Cuentas bancarias
- **Story**: Historias temporales

---

## 🚀 Estado del Proyecto

### ✅ Implementado:
- Autenticación completa
- Mensajería en tiempo real
- Gestión de proyectos y gastos
- Generación de documentos
- Catálogo con IA
- Reportes financieros
- Firma digital
- Onboarding

### 🔄 En Desarrollo / Mejoras Futuras:
- Integración completa con Firebase (actualmente usa datos mock)
- Sincronización de datos en la nube
- Notificaciones push
- Más funcionalidades de IA
- Exportación de reportes
- Integración con servicios de pago

---

## 📝 Notas Técnicas

- Usa Firebase Realtime Database para mensajería
- Firebase Authentication para login
- Google Gemini AI para funcionalidades inteligentes
- Capacitor para compilación móvil nativa
- TypeScript para type safety
- Vite para desarrollo rápido

---

## 🔐 Seguridad

- Autenticación Firebase
- Datos encriptados en tránsito
- Variables de entorno para API keys
- Validación de tipos con TypeScript

---

## 📞 Contacto y Documentación

- Ver `FIREBASE-SETUP.md` para configuración de Firebase
- Ver `INICIO-RAPIDO-FIREBASE.md` para inicio rápido
- Ver `CATALOGO-IA.md` para funcionalidades de IA (si existe)

---

**Versión**: 0.0.0  
**Última actualización**: 2024  
**Licencia**: Privada

