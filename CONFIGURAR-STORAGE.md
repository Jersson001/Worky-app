# ⚡ Configuración Rápida de Firebase Storage

## 🚀 Pasos Rápidos (5 minutos)

### 1. Habilitar Firebase Storage

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **worky-app-001**
3. En el menú lateral izquierdo, busca y haz clic en **"Storage"** (Almacenamiento)
4. Si es la primera vez, verás un botón **"Comenzar"** o **"Get started"**
5. Haz clic en **"Comenzar"**
6. Te aparecerá una pantalla de configuración inicial:
   - **Reglas de seguridad**: Por defecto aparecerá "Start in test mode" o "Comenzar en modo de prueba"
   - **Ubicación del bucket**: Selecciona una ubicación (puede aparecer como "Cloud Storage location")
7. **IMPORTANTE**: 
   - Si ves "Start in test mode", está bien, luego configuraremos las reglas manualmente
   - Para la ubicación, elige la más cercana a tus usuarios (ej: `us-central1`, `southamerica-east1`, etc.)
8. Haz clic en **"Listo"** o **"Done"**

**Nota**: Si ya tienes Storage habilitado, solo ve directamente al paso 2 para configurar las reglas.

### 2. Configurar Reglas de Seguridad

1. En Storage, haz clic en la pestaña **"Reglas"**
2. **Copia y pega** el contenido del archivo `firebase-storage-rules.txt`
3. Haz clic en **"Publicar"**

### 3. Verificar

1. Abre tu app
2. Inicia sesión
3. Abre un chat
4. Haz clic en el botón de adjuntar (📎)
5. Selecciona "Archivo"
6. Elige un archivo
7. ✅ Debería subirse correctamente

---

## 📋 Contenido de las Reglas

Las reglas están en `firebase-storage-rules.txt`. Cópialas y pégalas en Firebase Console → Storage → Reglas.

---

## ✅ Listo

Una vez configurado, los usuarios podrán:
- ✅ Subir archivos hasta 10MB
- ✅ Compartir archivos en chats
- ✅ Descargar archivos compartidos
- ✅ Solo acceder a sus propios archivos

---

## 🆘 Si algo falla

1. Verifica que Storage esté habilitado
2. Verifica que las reglas estén publicadas
3. Verifica que el usuario esté autenticado
4. Revisa la consola del navegador para errores

---

**¡Eso es todo! Tu app ahora puede compartir archivos de forma segura.** 🎉

