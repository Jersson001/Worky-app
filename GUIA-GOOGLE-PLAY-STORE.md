# 📱 Guía para Publicar Worky en Google Play Store

Esta guía te llevará paso a paso para publicar tu aplicación Worky en Google Play Store.

---

## ⛔ La versión 2.1 fue rechazada — qué falta

Google Play rechazó el `versionCode` **14** (versión 2.1) en agosto de 2026. No
fue por el contenido de la app:

> **Faltan las credenciales de inicio de sesión.** No has proporcionado ninguna
> información de inicio de sesión para que el equipo de revisión acceda al
> contenido de la app.

**Para volver a enviar hacen falta tres cosas:**

1. **Una cuenta de demostración activa** con credenciales en Play Console →
   *Prueba y lanzamiento* → **Detalles de inicio de sesión de la app**. Tienen
   que seguir funcionando en cada envío.
2. **Subir el icono de la ficha**: [assets/play-store-512.png](assets/play-store-512.png),
   512×512. Va a mano en *Presencia en Store* → *Ficha principal* → **Icono de la
   app**; no sale del bundle.
3. **Subir el `versionCode`**. El 14 quedó marcado como rechazado, así que el
   próximo envío va con el **15**.

> Una idea para las credenciales: ahora se puede entrar solo con un alias, sin
> correo ni celular. Puede ser la forma más simple de darle acceso al revisor —
> pero hay que explicárselo en las instrucciones, porque no es un formulario de
> usuario y contraseña como el que esperan.

---

## ✅ Estado actual del proyecto

- ✅ Keystore configurado (`worky-release.jks`), con las contraseñas en
  `android/keystore.properties` (fuera del repositorio)
- ✅ Configuración de firma en `build.gradle`
- ✅ App ID: `com.worky.app.v2`
- ℹ️ **No hay `google-services.json` ni hace falta**: era de Firebase, que ya no
  se usa. Gradle solo aplica ese plugin si el archivo existe, así que su
  ausencia no rompe nada. Lo único que se pierde son las notificaciones push,
  que tampoco están implementadas.
- ✅ **Icono de la app**: ya es el logo de Worky. Hasta agosto de 2026 el bundle
  llevaba el icono de plantilla de Capacitor, porque nunca se reemplazó. Los
  originales están en `assets/`; para regenerarlo todo:
  `npx @capacitor/assets generate --android`
- ⛔ VersionCode 14 (2.1) **rechazado**. Ver arriba.

---

## 🚀 Paso 1: Generar el Android App Bundle (AAB)

Google Play Store requiere un **AAB (Android App Bundle)** en lugar de APK para nuevas publicaciones.

### 1.1 Compilar el proyecto web

```bash
npm run build
```

### 1.2 Sincronizar con Capacitor

```bash
npx cap sync android
```

### 1.3 Generar el AAB de producción

**En Windows (PowerShell):**
```powershell
cd android
.\gradlew bundleRelease
```

**En Linux/Mac:**
```bash
cd android
./gradlew bundleRelease
```

### 1.4 Ubicación del AAB

El archivo AAB estará en:
```
android/app/build/outputs/bundle/release/app-release.aab
```

⚠️ **IMPORTANTE**: Guarda este archivo en un lugar seguro. Lo necesitarás para subirlo a Google Play Console.

---

## 📋 Paso 2: Crear Cuenta de Desarrollador en Google Play

### 2.1 Acceder a Google Play Console

1. Ve a [Google Play Console](https://play.google.com/console)
2. Inicia sesión con tu cuenta de Google

### 2.2 Crear cuenta de desarrollador

1. Si es tu primera vez, haz clic en **"Crear cuenta de desarrollador"**
2. Completa el formulario:
   - **Nombre del desarrollador**: Tu nombre o nombre de tu empresa
   - **Información de contacto**: Email y teléfono
   - **Acepta los términos y condiciones**
3. **Pago único**: $25 USD (solo se paga una vez, de por vida)

### 2.3 Verificar identidad

- Google puede solicitar verificación de identidad
- Proceso típico: 1-2 días hábiles

---

## 📦 Paso 3: Crear la Aplicación en Play Console

### 3.1 Crear nueva app

1. En Play Console, haz clic en **"Crear aplicación"**
2. Completa:
   - **Nombre de la app**: "Worky"
   - **Idioma predeterminado**: Español (España) o tu idioma
   - **Tipo de app**: Aplicación
   - **Gratis o de pago**: Gratis
   - **Declaraciones**: Marca las casillas según corresponda

### 3.2 Configurar la tienda

#### Información de la tienda

1. **Nombre de la app**: Worky
2. **Descripción corta** (80 caracteres):
   ```
   Gestión completa para emprendedores: proyectos, clientes, cotizaciones y más
   ```

3. **Descripción completa** (4000 caracteres):
   ```
   Worky es la aplicación todo-en-uno para emprendedores que buscan gestionar 
   su negocio de manera eficiente. Con Worky puedes:
   
   💬 Mensajería en tiempo real con clientes
   👥 Gestión completa de contactos y clientes
   📦 Catálogo de productos que compartes por QR o enlace
   📊 Gestión de proyectos y gastos
   💰 Control de cuentas bancarias
   📄 Cotizaciones por capítulos, con materiales y cálculo de ferretería
   🧾 Facturas, recibos de caja y cuentas de cobro
   
   Características principales:
   - Sincronización en la nube
   - Comparte cotizaciones y catálogo por WhatsApp
   - Interfaz intuitiva y moderna
   
   Ideal para emprendedores, freelancers y pequeñas empresas que necesitan 
   una solución completa para gestionar sus proyectos y clientes.
   ```

4. **Icono de la app**:
   - Tamaño: 512x512 px (PNG, sin transparencia)
   - Archivo: [assets/play-store-512.png](assets/play-store-512.png)
   - Va a mano en la ficha; no sale del bundle

5. **Capturas de pantalla** (mínimo 2, recomendado 4-8):
   - Teléfono: 16:9 o 9:16, mínimo 320px, máximo 3840px
   - Tamaños recomendados: 1080x1920 px o 1440x2560 px
   - Deben mostrar las funcionalidades principales de la app

6. **Imagen destacada** (opcional pero recomendado):
   - 1024x500 px (JPG o PNG de 24 bits)

7. **Categoría**: Productividad o Negocios

8. **Clasificación de contenido**: 
   - Selecciona las opciones apropiadas (probablemente "Todos" o "PEGI 3")

---

## 🔐 Paso 4: Configurar Firma de la App

### 4.1 Subir el AAB

1. En Play Console, ve a **"Producción"** → **"Crear versión"**
2. Haz clic en **"Subir"** y selecciona tu archivo `app-release.aab`
3. Google Play verificará automáticamente la firma

### 4.2 Configurar firma por Google Play (Recomendado)

Google Play puede gestionar la firma por ti:
1. Ve a **"Configuración"** → **"Firma de la app"**
2. Selecciona **"Dejar que Google Play gestione y proteja tu clave de firma"**
3. Esto es más seguro y recomendado

⚠️ **NOTA**: Si ya subiste un AAB firmado, Google Play usará esa firma.

---

## ✅ Paso 5: Completar Políticas y Declaraciones

### 5.1 Política de privacidad

**OBLIGATORIO**: Necesitas una URL pública con tu política de privacidad.

Puedes:
- Crear una página en tu sitio web
- Usar un generador como [Privacy Policy Generator](https://www.privacypolicygenerator.info/)
- Hostearla en GitHub Pages, Vercel, etc.

La política debe incluir:
- Qué datos recopilas (cuenta, contactos, mensajes, fotos que subes)
- Que el backend es Supabase y dónde se guardan los datos
- Cómo usas los datos
- Cómo proteges los datos
- Información de contacto

### 5.2 Declaraciones de permisos

En Play Console, declara:
- ✅ **Cámara**: Para tomar fotos de productos/documentos
- ✅ **Almacenamiento**: Para guardar archivos
- ✅ **Internet**: Para sincronizar con el servidor
- ✅ **Vibración**: Para notificaciones

### 5.3 Contenido objetivo

- **Audiencia objetivo**: Selecciona según tu app
- **Clasificación de contenido**: Completa el cuestionario

---

## 🧪 Paso 6: Testing (Opcional pero Recomendado)

### 6.1 Crear track de prueba interna

1. Ve a **"Testing"** → **"Internal testing"**
2. Crea un grupo de prueba
3. Agrega emails de testers
4. Sube el mismo AAB
5. Comparte el enlace de prueba con tus testers

### 6.2 Probar antes de publicar

- Verifica que la app funciona correctamente
- Prueba en diferentes dispositivos Android
- Verifica que la app conecta con Supabase (registro, chat, catálogo)
- Prueba el atajo por alias, que es lo que verá el revisor

---

## 🚀 Paso 7: Publicar la App

### 7.1 Revisar checklist

Antes de publicar, verifica:
- ✅ AAB subido y verificado
- ✅ Información de la tienda completa
- ✅ Icono y capturas de pantalla subidos
- ✅ Política de privacidad configurada
- ✅ Declaraciones completadas
- ✅ Contenido objetivo configurado

### 7.2 Enviar para revisión

1. Ve a **"Producción"** → **"Crear versión"**
2. Completa la información de la versión:
   - **Notas de la versión**: "Primera versión de Worky"
3. Haz clic en **"Revisar versión"**
4. Revisa todos los detalles
5. Haz clic en **"Iniciar publicación en producción"**

### 7.3 Tiempo de revisión

- **Primera publicación**: 1-7 días (típicamente 2-3 días)
- **Actualizaciones**: 1-3 días (típicamente 24-48 horas)

---

## 📊 Paso 8: Después de la Publicación

### 8.1 Monitorear

- Revisa **"Estadísticas"** para ver descargas
- Revisa **"Calificaciones y reseñas"**
- Revisa **"Errores y ANR"** (Application Not Responding)

### 8.2 Actualizar la app

Para futuras actualizaciones:

1. **Incrementa el versionCode** en `android/app/build.gradle`:
   ```gradle
   versionCode 3  // Incrementa este número
   versionName "1.1"  // Actualiza la versión visible
   ```

2. **Genera nuevo AAB**:
   ```bash
   npm run build
   npx cap sync android
   cd android
   ./gradlew bundleRelease
   ```

3. **Sube el nuevo AAB** en Play Console

---

## 🔧 Comandos Rápidos de Referencia

```bash
# 1. Build completo
npm run build

# 2. Sincronizar Capacitor
npx cap sync android

# 3. Generar AAB de producción
cd android
./gradlew bundleRelease

# El AAB estará en:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## ⚠️ Problemas Comunes y Soluciones

### Error: "AAB no se puede subir"
- Verifica que el AAB esté firmado correctamente
- Asegúrate de usar `bundleRelease` y no `assembleRelease`

### Error: "Política de privacidad requerida"
- Debes tener una URL pública con tu política de privacidad
- Asegúrate de que la URL sea accesible sin autenticación

### Error: "Icono no cumple requisitos"
- El icono debe ser 512x512 px
- Sin transparencia (PNG sólido)
- Sin bordes o efectos adicionales

### Error: "VersionCode ya existe"
- Incrementa el `versionCode` en `build.gradle`
- Cada versión debe tener un versionCode único y mayor

---

## 📝 Checklist Final Antes de Publicar

- [ ] AAB generado y verificado
- [ ] Cuenta de desarrollador creada y verificada
- [ ] Información de la tienda completa
- [ ] Icono 512x512 px subido
- [ ] Mínimo 2 capturas de pantalla subidas
- [ ] Política de privacidad configurada (URL pública)
- [ ] Declaraciones completadas
- [ ] Contenido objetivo configurado
- [ ] App probada en dispositivos reales
- [ ] Credenciales de la cuenta de demostración cargadas y probadas
- [ ] Versión de producción lista

---

## 🎉 ¡Listo!

Una vez que Google apruebe tu app, estará disponible en Google Play Store para que los usuarios la descarguen.

**Recuerda**: La primera publicación puede tardar varios días en ser aprobada. Sé paciente y revisa tu email para cualquier solicitud de Google.

---

## 📚 Recursos Adicionales

- [Documentación de Google Play Console](https://support.google.com/googleplay/android-developer)
- [Guía de políticas de Google Play](https://play.google.com/about/developer-content-policy/)
- [Mejores prácticas de diseño](https://developer.android.com/design)

---

**¡Buena suerte con tu publicación! 🚀**












