# 📸 Guía Visual: Configurar Firebase Storage

## 🎯 Objetivo
Habilitar Firebase Storage para que los usuarios puedan compartir archivos en la app.

---

## 📋 Paso 1: Acceder a Storage

1. Abre [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto **worky-app-001**
3. En el menú lateral izquierdo, busca:
   - **"Storage"** (en inglés)
   - **"Almacenamiento"** (en español)
   - Icono: 📦 (caja/almacén)

---

## 📋 Paso 2: Habilitar Storage (Primera Vez)

Si es la primera vez que usas Storage:

### Opción A: Si ves un botón "Comenzar" o "Get started"

1. Haz clic en **"Comenzar"** o **"Get started"**
2. Verás una pantalla con opciones:
   
   **Pantalla que verás:**
   ```
   ┌─────────────────────────────────────┐
   │  Cloud Storage for Firebase         │
   │                                     │
   │  ☐ Start in test mode              │
   │     (Permite lectura/escritura     │
   │      durante 30 días)               │
   │                                     │
   │  ☐ Start in production mode        │
   │     (Bloquea todo el acceso)        │
   │                                     │
   │  Cloud Storage location:            │
   │  [Dropdown con ubicaciones]        │
   │                                     │
   │  [Cancel]  [Done / Listo]          │
   └─────────────────────────────────────┘
   ```

3. **Qué hacer:**
   - ✅ Marca **"Start in test mode"** (está bien, luego configuraremos las reglas)
   - ✅ En el dropdown de ubicación, elige la más cercana:
     - `us-central1` (Iowa, USA) - Recomendado para América
     - `southamerica-east1` (São Paulo, Brasil) - Para Sudamérica
     - `europe-west1` (Bélgica) - Para Europa
   - ✅ Haz clic en **"Done"** o **"Listo"**

### Opción B: Si NO ves esas opciones

Algunas versiones de Firebase muestran una pantalla más simple:

1. Haz clic en **"Comenzar"**
2. Solo te pedirá la **ubicación** (location)
3. Selecciona una ubicación del dropdown
4. Haz clic en **"Listo"** o **"Done"**

**Nota**: Si no ves opciones de "modo", no te preocupes. Las reglas las configuraremos manualmente en el siguiente paso.

---

## 📋 Paso 3: Verificar que Storage está Habilitado

Después de hacer clic en "Listo", deberías ver:

1. Una pantalla que dice **"Cloud Storage"** o **"Almacenamiento"**
2. Una pestaña que dice **"Files"** o **"Archivos"** (puede estar vacía)
3. Una pestaña que dice **"Rules"** o **"Reglas"**

✅ Si ves esto, Storage está habilitado. Continúa al Paso 4.

---

## 📋 Paso 4: Configurar Reglas de Seguridad

1. En la pantalla de Storage, haz clic en la pestaña **"Rules"** o **"Reglas"**
2. Verás un editor de código con reglas por defecto
3. **Borra todo** el contenido actual
4. Abre el archivo `firebase-storage-rules.txt` de tu proyecto
5. **Copia todo** el contenido
6. **Pega** en el editor de Firebase
7. Haz clic en **"Publicar"** o **"Publish"**

**Deberías ver un mensaje de confirmación** ✅

---

## 📋 Paso 5: Probar que Funciona

1. Abre tu app Worky
2. Inicia sesión
3. Abre un chat con un contacto
4. Haz clic en el botón de adjuntar (📎)
5. Selecciona **"Archivo"**
6. Elige un archivo (PDF, imagen, etc.)
7. ✅ El archivo debería subirse y aparecer en el chat

---

## 🆘 Solución de Problemas

### No veo "Storage" en el menú

**Solución:**
- Verifica que estés en el proyecto correcto
- El menú puede estar colapsado, busca el icono de menú (☰)
- Storage puede estar en la sección "Build" o "Construir"

### No veo opciones de "modo" o "ubicación"

**Solución:**
- Es normal en algunas versiones de Firebase
- Solo necesitas hacer clic en "Comenzar" y seleccionar ubicación si aparece
- Las reglas las configurarás manualmente después

### Veo un error al publicar las reglas

**Solución:**
- Verifica que copiaste TODO el contenido de `firebase-storage-rules.txt`
- Asegúrate de que no haya caracteres extraños
- Intenta copiar y pegar de nuevo

### El archivo no se sube

**Solución:**
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Busca errores en rojo
4. Verifica que:
   - El usuario esté autenticado
   - Las reglas estén publicadas
   - El archivo no exceda 10MB

---

## ✅ Checklist Final

- [ ] Storage está habilitado en Firebase Console
- [ ] Veo la pestaña "Rules" o "Reglas"
- [ ] Las reglas están publicadas (veo mensaje de confirmación)
- [ ] Puedo subir un archivo desde la app
- [ ] El archivo aparece en el chat

---

## 📞 ¿Necesitas Ayuda?

Si sigues teniendo problemas:

1. **Toma una captura de pantalla** de lo que ves en Firebase Console
2. **Revisa la consola del navegador** (F12) para ver errores
3. **Verifica** que estés en el proyecto correcto

---

**¡Listo! Una vez completados estos pasos, tu app podrá compartir archivos de forma segura.** 🎉








