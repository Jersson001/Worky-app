# 🔒 Reglas de Seguridad de Firebase Storage

Esta guía te ayudará a configurar las reglas de seguridad de Firebase Storage para que los usuarios puedan compartir archivos de forma segura.

---

## 📋 Paso 1: Acceder a Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto **worky-app-001** (o el nombre de tu proyecto)
3. En el menú lateral, haz clic en **Storage**
4. Si no tienes Storage habilitado, haz clic en **"Comenzar"** y sigue las instrucciones

---

## 🔐 Paso 2: Configurar Reglas de Seguridad

1. En la pestaña **Storage**, haz clic en **"Reglas"** (Rules)
2. Reemplaza el contenido con las siguientes reglas:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Regla para archivos compartidos en chats
    match /chats/{userId}/{contactId}/{fileName} {
      // Permitir lectura si el usuario es el propietario o el contacto
      allow read: if request.auth != null && 
                     (request.auth.uid == userId || request.auth.uid == contactId);
      
      // Permitir escritura solo al propietario del archivo
      allow write: if request.auth != null && request.auth.uid == userId
                     && request.resource.size < 10 * 1024 * 1024  // Máximo 10MB
                     && request.resource.contentType.matches('image/.*|application/pdf|application/msword|application/vnd.openxmlformats-officedocument.*|text/plain|application/zip|application/x-zip-compressed');
      
      // Permitir eliminación solo al propietario
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Regla para archivos generales del usuario
    match /files/{userId}/{fileName} {
      // Permitir lectura solo al propietario
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Permitir escritura solo al propietario
      allow write: if request.auth != null && request.auth.uid == userId
                     && request.resource.size < 10 * 1024 * 1024  // Máximo 10MB
                     && request.resource.contentType.matches('image/.*|application/pdf|application/msword|application/vnd.openxmlformats-officedocument.*|text/plain|application/zip|application/x-zip-compressed');
      
      // Permitir eliminación solo al propietario
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Denegar acceso a todo lo demás
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Haz clic en **"Publicar"** (Publish)

---

## ✅ Paso 3: Verificar Configuración

### Verificación Manual

1. **Reglas publicadas**: Deberías ver un mensaje de confirmación
2. **Estructura de Storage**: Los archivos se organizarán así:
   ```
   chats/
     {userId}/
       {contactId}/
         {timestamp}_{filename}
   files/
     {userId}/
       {timestamp}_{filename}
   ```

---

## 🔍 Explicación de las Reglas

### Regla 1: Archivos de Chat (`/chats/{userId}/{contactId}/{fileName}`)

**Lectura:**
- ✅ El usuario propietario puede leer sus archivos
- ✅ El contacto con quien se comparte puede leer los archivos
- ❌ Otros usuarios no pueden leer

**Escritura:**
- ✅ Solo el usuario propietario puede subir archivos
- ✅ Validación de tamaño: máximo 10MB
- ✅ Validación de tipo: solo tipos permitidos

**Eliminación:**
- ✅ Solo el usuario propietario puede eliminar

### Regla 2: Archivos Generales (`/files/{userId}/{fileName}`)

**Lectura/Escritura/Eliminación:**
- ✅ Solo el usuario propietario puede acceder
- ✅ Mismas validaciones de tamaño y tipo

### Regla 3: Denegar Todo lo Demás

- ❌ Cualquier otra ruta está bloqueada por seguridad

---

## 🛡️ Tipos de Archivo Permitidos

Las reglas permiten:
- **Imágenes**: `image/*` (JPG, PNG, GIF, WebP, etc.)
- **PDFs**: `application/pdf`
- **Word**: `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Excel**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Texto**: `text/plain`
- **ZIP**: `application/zip`, `application/x-zip-compressed`

---

## ⚠️ Reglas de Desarrollo (Solo para Testing)

**⚠️ NO USAR EN PRODUCCIÓN**

Si necesitas probar rápidamente (solo desarrollo):

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Esta regla permite a cualquier usuario autenticado leer/escribir cualquier archivo. Úsala solo para desarrollo.**

---

## 🧪 Probar las Reglas

### Test 1: Subir Archivo
1. Abre la app
2. Inicia sesión
3. Abre un chat
4. Intenta subir un archivo
5. ✅ Debería funcionar si estás autenticado

### Test 2: Descargar Archivo
1. Abre un chat con un archivo compartido
2. Haz clic en "Descargar"
3. ✅ Debería descargar si eres el propietario o el contacto

### Test 3: Acceso Denegado
1. Intenta acceder a un archivo de otro usuario
2. ❌ Debería denegar el acceso

---

## 🔧 Solución de Problemas

### Error: "Permission denied"
- **Causa**: Las reglas no permiten la acción
- **Solución**: Verifica que el usuario esté autenticado y tenga permisos

### Error: "File too large"
- **Causa**: El archivo excede 10MB
- **Solución**: Reduce el tamaño del archivo o aumenta el límite en las reglas

### Error: "File type not allowed"
- **Causa**: El tipo de archivo no está permitido
- **Solución**: Verifica que el tipo esté en la lista de permitidos

### Error: "Storage not initialized"
- **Causa**: Firebase Storage no está configurado
- **Solución**: Verifica que Storage esté habilitado en Firebase Console

---

## 📝 Notas Importantes

1. **Autenticación Requerida**: Todas las operaciones requieren autenticación
2. **Tamaño Máximo**: 10MB por archivo (puedes ajustarlo)
3. **Tipos Permitidos**: Solo los tipos especificados en las reglas
4. **Organización**: Los archivos se organizan por usuario y contacto
5. **Seguridad**: Cada usuario solo puede acceder a sus propios archivos y los compartidos con él

---

## 🚀 Próximos Pasos

1. ✅ Configura las reglas en Firebase Console
2. ✅ Prueba subir un archivo desde la app
3. ✅ Verifica que otro usuario pueda descargarlo
4. ✅ Revisa los archivos en Firebase Console → Storage

---

## 📚 Recursos Adicionales

- [Documentación de Firebase Storage Rules](https://firebase.google.com/docs/storage/security)
- [Guía de Reglas de Seguridad](https://firebase.google.com/docs/rules)
- [Simulador de Reglas](https://firebase.google.com/docs/rules/use-debugging)

---

**¡Listo! Tus archivos ahora están protegidos y solo accesibles por usuarios autorizados.** 🔒








