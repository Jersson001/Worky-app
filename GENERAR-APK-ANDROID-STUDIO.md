# 📱 Generar APK desde Android Studio

Guía paso a paso para generar el APK de Worky desde Android Studio.

---

## 📋 Paso 1: Abrir el Proyecto en Android Studio

1. Abre **Android Studio**
2. Selecciona **"Open"** o **"Abrir"**
3. Navega a la carpeta: `worky_app/android`
4. Haz clic en **"OK"**

**Espera** a que Android Studio sincronice el proyecto (puede tardar unos minutos la primera vez).

---

## 📋 Paso 2: Sincronizar Capacitor (Importante)

Antes de generar el APK, asegúrate de que el código web esté sincronizado:

### Opción A: Desde la Terminal en Android Studio

1. En Android Studio, abre la terminal (abajo)
2. Ejecuta:
   ```bash
   cd ..
   npm run build
   npx cap sync android
   ```

### Opción B: Desde la Terminal Externa

1. Abre PowerShell o CMD
2. Navega a la carpeta del proyecto:
   ```bash
   cd "D:\Documents\Proyectos\Worky app\worky_app"
   ```
3. Ejecuta:
   ```bash
   npm run build
   npx cap sync android
   ```

---

## 📋 Paso 3: Generar el APK

### Método 1: Desde Android Studio (Recomendado)

1. En Android Studio, ve al menú: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Espera a que termine la compilación
3. Cuando termine, verás una notificación: **"APK(s) generated successfully"**
4. Haz clic en **"locate"** o **"ubicar"** en la notificación
5. El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

### Método 2: Desde la Terminal

1. Abre la terminal en Android Studio
2. Ejecuta:
   ```bash
   cd android
   .\gradlew assembleDebug
   ```
3. El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📋 Paso 4: Instalar el APK en tu Dispositivo

### Opción A: Transferir Manualmente

1. **Copia el APK** a tu teléfono:
   - Por USB: conecta el teléfono y copia el archivo
   - Por email: envíatelo a ti mismo
   - Por Google Drive/Dropbox: súbelo y descárgalo en el teléfono

2. **En tu teléfono Android:**
   - Abre el archivo APK
   - Si aparece "Instalar desde fuentes desconocidas", permite la instalación
   - Haz clic en **"Instalar"**

### Opción B: Instalar Directamente desde Android Studio

1. Conecta tu teléfono por USB
2. Habilita **"Depuración USB"** en tu teléfono:
   - Ve a **Configuración** → **Opciones de desarrollador**
   - Activa **"Depuración USB"**
3. En Android Studio, haz clic en el botón **"Run"** (▶️) o presiona **Shift + F10**
4. Selecciona tu dispositivo
5. La app se instalará automáticamente

---

## 📋 Paso 5: Probar la App

1. **Abre la app** en tu teléfono
2. **Regístrate o inicia sesión**:
   - Usa email o teléfono
   - Completa la verificación
3. **Prueba las funcionalidades:**
   - ✅ Crear contactos
   - ✅ Enviar mensajes
   - ✅ Subir archivos (si estás autenticado)
   - ✅ Buscar usuarios

---

## 🔧 Solución de Problemas

### Error: "Gradle sync failed"

**Solución:**
1. Ve a **File** → **Invalidate Caches / Restart**
2. Selecciona **"Invalidate and Restart"**
3. Espera a que Android Studio reinicie

### Error: "SDK not found"

**Solución:**
1. Ve a **File** → **Project Structure**
2. Verifica que el **Android SDK** esté configurado
3. Si no, instálalo desde **Tools** → **SDK Manager**

### Error: "Build failed"

**Solución:**
1. Verifica que hayas ejecutado `npm run build` y `npx cap sync android`
2. Limpia el proyecto: **Build** → **Clean Project**
3. Reconstruye: **Build** → **Rebuild Project**

### El APK no se instala

**Solución:**
1. Verifica que tengas **"Instalar desde fuentes desconocidas"** habilitado
2. Desinstala versiones anteriores de la app
3. Intenta instalar de nuevo

---

## 📝 Notas Importantes

### APK Debug vs Release

- **Debug APK**: Para pruebas, más grande, incluye información de depuración
- **Release APK**: Para distribución, más pequeño, optimizado

### Para Publicar en Google Play

Necesitas un **AAB (Android App Bundle)**, no un APK:
- **Build** → **Build Bundle(s) / APK(s)** → **Build Bundle(s)**
- El AAB estará en: `android/app/build/outputs/bundle/release/app-release.aab`

---

## ✅ Checklist Antes de Generar APK

- [ ] Código web compilado (`npm run build`)
- [ ] Capacitor sincronizado (`npx cap sync android`)
- [ ] Android Studio abierto con el proyecto
- [ ] Gradle sincronizado correctamente
- [ ] Sin errores en el proyecto

---

## 🚀 Comandos Rápidos

```bash
# 1. Compilar web
npm run build

# 2. Sincronizar Capacitor
npx cap sync android

# 3. Generar APK Debug
cd android
.\gradlew assembleDebug

# 4. Generar APK Release (firmado)
.\gradlew assembleRelease

# 5. Generar AAB para Play Store
.\gradlew bundleRelease
```

---

**¡Listo! Una vez generado el APK, puedes instalarlo en tu dispositivo y probar todas las funcionalidades.** 📱✨












