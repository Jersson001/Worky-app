# 🔥 Configuración de Firebase para Worky

## ✅ Paso 1: Crear proyecto en Firebase Console

1. Ve a https://console.firebase.google.com/
2. Haz clic en **"Agregar proyecto"** o **"Create a project"**
3. Nombre del proyecto: **Worky** (o el nombre que prefieras)
4. Acepta los términos y sigue los pasos
5. Clic en **"Crear proyecto"**

## ✅ Paso 2: Habilitar Realtime Database

1. En el menú lateral izquierdo, ve a **Build → Realtime Database**
2. Haz clic en **"Crear base de datos"** o **"Create Database"**
3. Selecciona ubicación: **United States (us-central1)** o la más cercana
4. Modo de seguridad: Selecciona **"Comenzar en modo de prueba"** por ahora
5. Clic en **"Habilitar"**

⚠️ **IMPORTANTE**: Esto creará la base de datos en modo público temporalmente. Después configuraremos reglas de seguridad.

## ✅ Paso 3: Configurar para Web

1. En la página principal de Firebase Console, clic en el ícono **</>** (Web)
2. Nickname de la app: **Worky Web**
3. ✅ Marca **"También configurar Firebase Hosting"** (opcional)
4. Clic en **"Registrar app"**

## ✅ Paso 4: Copiar credenciales

Verás un código como este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC-xxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "worky-xxxxx.firebaseapp.com",
  databaseURL: "https://worky-xxxxx-default-rtdb.firebaseio.com",
  projectId: "worky-xxxxx",
  storageBucket: "worky-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

## ✅ Paso 5: Actualizar archivo .env

1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza los valores con tus credenciales de Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://tu_proyecto-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

## ✅ Paso 6: Configurar reglas de seguridad

1. En Firebase Console, ve a **Realtime Database → Reglas**
2. Reemplaza las reglas con estas (para desarrollo):

```json
{
  "rules": {
    "chats": {
      "$chatId": {
        ".read": true,
        ".write": true
      }
    },
    "users": {
      "$userId": {
        ".read": true,
        ".write": "$userId === auth.uid || auth == null"
      }
    },
    "userChats": {
      "$userId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

3. Clic en **"Publicar"**

⚠️ **Nota**: Estas reglas son para desarrollo. En producción necesitarás reglas más estrictas con autenticación.

## ✅ Paso 7: Reiniciar servidor de desarrollo

1. Detén el servidor (Ctrl+C en la terminal)
2. Ejecuta: `npm run dev`
3. Abre la app en http://localhost:3000

## 🎉 ¡Listo!

Ahora tu app puede:
- ✅ Enviar y recibir mensajes en tiempo real
- ✅ Sincronizar entre múltiples dispositivos
- ✅ Guardar contactos en la nube
- ✅ Almacenar perfiles de usuario

## 📱 Para probar en otro celular:

1. Conecta ambos dispositivos a la misma red WiFi
2. En tu celular 1: Abre http://TU_IP:3000 (ej: http://192.168.1.10:3000)
3. En tu celular 2: Abre la misma URL
4. ¡Envía mensajes entre ambos!

## 🔐 (Opcional) Habilitar Authentication

Si quieres autenticación por teléfono o email:

1. Ve a **Build → Authentication**
2. Clic en **"Comenzar"**
3. Habilita los métodos que necesites:
   - ✅ Correo electrónico/Contraseña
   - ✅ Teléfono
   - ✅ Google
   - ✅ Facebook

## 🐛 Solución de problemas

### Error: "Firebase not initialized"
- Verifica que el archivo `.env` esté en la raíz del proyecto
- Reinicia el servidor de desarrollo

### Error: "Permission denied"
- Verifica las reglas de seguridad en Firebase Console
- Asegúrate de que estén en modo público temporal

### Los mensajes no se sincronizan
- Verifica que `databaseURL` esté correcto en `.env`
- Abre la consola del navegador (F12) para ver errores

### No puedo enviar mensajes
- Verifica la conexión a Internet
- Revisa que Firebase esté configurado correctamente

### 5. Actualizar authService.ts

Abre el archivo `services/authService.ts` y reemplaza las credenciales:

```typescript
const firebaseConfig = {
  apiKey: "TU_API_KEY",          // ← Pegar aquí
  authDomain: "TU_AUTH_DOMAIN",   // ← Pegar aquí
  projectId: "TU_PROJECT_ID",     // ← Pegar aquí
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};
```

### 6. Configurar Gradle para Android

Edita `android/build.gradle` y agrega:

```gradle
buildscript {
    dependencies {
        // Agrega esta línea
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

Edita `android/app/build.gradle` y agrega al final:

```gradle
apply plugin: 'com.google.gms.google-services'
```

### 7. Sincronizar y compilar

```bash
npm run build
npx cap sync android
npx cap open android
```

## Flujo de autenticación

### Con Email:
1. Usuario ingresa email
2. Se envía link de verificación al correo
3. Usuario hace clic en el link
4. Se autentica automáticamente

### Con Teléfono:
1. Usuario ingresa número (formato: +57 300 123 4567)
2. Recibe SMS con código de 6 dígitos
3. Ingresa el código
4. Se autentica

## Testing

Para probar en desarrollo sin enviar SMS reales:

1. Ve a Firebase Console → Authentication → Sign-in method → Phone
2. En "Phone numbers for testing", agrega:
   - Número: +57 300 000 0000
   - Código: 123456

## Seguridad

⚠️ **IMPORTANTE:** 
- Nunca subas las credenciales de Firebase a GitHub
- Agrega `google-services.json` al `.gitignore`
- Configura restricciones de API en Firebase Console

## Solución de problemas

### Error: "auth/invalid-phone-number"
- Asegúrate de usar formato internacional: +57 300 123 4567

### Error: "auth/quota-exceeded"
- Has excedido el límite de SMS. Usa números de prueba.

### El link de email no funciona
- Verifica que el dominio esté autorizado en Firebase Console
- Authentication → Settings → Authorized domains

---

¿Necesitas ayuda? Revisa la documentación oficial:
- https://firebase.google.com/docs/auth/android/start
- https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/authentication
