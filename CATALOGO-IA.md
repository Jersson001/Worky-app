# Descripciones de producto con IA — retirado

Última revisión: 1 de septiembre de 2026.

**Esta funcionalidad ya no está en la app.** Este documento se conserva para que
quede constancia de qué hubo, por qué se quitó y qué código sigue ahí sin usar.

---

## Qué hacía

Al subir la foto de un producto, Gemini (`gemini-2.5-flash`) escribía sola la
descripción, sugería cómo mejorar la foto y listaba las características que
detectaba. La descripción caía directamente en el campo **Descripción** del
producto.

---

## Por qué se retiró

Porque **escribía en el campo del usuario y cuando fallaba dejaba basura ahí**:
si la llamada no salía bien, en Descripción aparecía literalmente

```
Error al analizar la imagen
```

Un producto publicado con ese texto de descripción es peor que un producto sin
descripción, y el vendedor no tenía por qué darse cuenta antes de publicar el
catálogo.

Además cada análisis gastaba cuota de la API por algo que la mayoría de los
vendedores reescribía a mano.

Está anotado en la lista de
[ESTADO-FUNCIONALIDADES.md](ESTADO-FUNCIONALIDADES.md#lo-que-no-hay).

---

## Qué quedó sin usar

Ninguna de estas piezas la llama nadie en el código actual:

| Qué | Dónde |
|---|---|
| `generateProductDescription`, `enhanceProductImage` | [services/geminiService.ts](services/geminiService.ts) |
| Edge Function que hablaba con Gemini | `supabase/functions/gemini/index.ts` |
| `GEMINI_API_KEY` | Ya no está en `env.example` |

`geminiService.ts` invoca la Edge Function `gemini`, y a `geminiService.ts` no lo
importa ningún archivo. Se pueden borrar los dos juntos.

---

## Si algún día se retoma

Dos cosas que no conviene repetir:

- **Que no escriba directamente en el campo del usuario.** Que proponga y que el
  vendedor acepte, para que un fallo no deje texto de error dentro de un
  producto publicado.
- **Que el fallo se vea como fallo**, no como contenido.

El resto del catálogo —publicar, compartir por QR, que el cliente marque
productos y le lleguen al vendedor— funciona sin IA y está en
[ESTADO-FUNCIONALIDADES.md](ESTADO-FUNCIONALIDADES.md#catálogo) e
[IDEAS-CATALOGO.md](IDEAS-CATALOGO.md).
