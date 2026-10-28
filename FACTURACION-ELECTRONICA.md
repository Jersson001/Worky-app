# Factura electrónica en Worky — diseño

Última revisión: 28 de octubre de 2026.

**Estado: solo diseño y un traductor.** No emite nada. Falta hablar con Factus
(ver «Preguntas») y no hay todavía credenciales ni se ha probado contra su sandbox.

## Qué se decidió y por qué

**Worky no se habilita ante la DIAN ni firma facturas.** Un proveedor tecnológico
autorizado lo hace por API. Se evaluó [Factus](https://factus.com.co) porque es el
único que describe, en su página, el caso de una plataforma que integra la
facturación para sus clientes, y tiene sandbox compartido sin costo. Dataico y
Alegra tienen API, pero no encontré en sus páginas ese caso ni precios de API. Las
opciones de código abierto (dian-kit y similares) obligarían a Worky a habilitarse,
guardar certificados de cada tienda y seguir los cambios de la DIAN: no.

Los datos de Factus de abajo salen de su documentación pública
(`developers.factus.com.co`), leída el 28/10/2026. Nada se probó contra su API.

## Cómo habla la API de Factus

| | |
|---|---|
| Sandbox / producción | `https://api-sandbox.factus.com.co` / `https://api.factus.com.co` |
| Autenticación | `POST /oauth/token`, OAuth2 con `grant_type=password`, `client_id`, `client_secret`, `username` y `password`. Devuelve `access_token` y `refresh_token`. La página dice que dura 1 hora y su ejemplo dice 600 s: hay que preguntarlo |
| Emitir | `POST /v2/bills/validate` con `Authorization: Bearer …` |
| Responde | `data.number`, `data.cufe`, `data.is_validated`, `data.links.qr` (portal DIAN) y `data.links.public_url` (la factura en Factus). El PDF y el XML se piden con `GET` aparte |
| Límite | 80 solicitudes por minuto por usuario; pasarse da 429 con `Retry-After` |
| Error 409 | Hay una factura pendiente de enviar a la DIAN: se elimina y se vuelve a crear |

Obligatorio en una factura: `reference_code`, `payment_details` (forma, medio y
monto), `customer` (tipo y número de documento, tipo de organización) y `items`
(código, nombre, cantidad, precio sin IVA, unidad, código estándar e impuestos). El
`numbering_range_id` solo se exige si la empresa tiene varios rangos activos.

## Lo que ya hay: `utils/facturaElectronica.ts`

`traducirFactura(factura, cliente, opciones)` convierte la `InvoiceData` de Worky al
cuerpo que pide Factus. Es una función pura, sin red:

- Los precios de Worky son **antes de IVA** (la factura suma el 19 % encima), igual
  que Factus; el impuesto va como `taxes` (código `01`, 19 %).
- Pagada → contado (`payment_form 1`); pendiente → crédito con vencimiento a 30 días.
- NIT con guion y dígito de verificación (`900.123.456-7`) → empresa (`company`);
  si no, persona natural (`names`).
- Devuelve también una lista de **supuestos** para que la tienda los confirme antes
  de emitir. Si falta algo esencial, lanza `FacturaIncompleta` con *todo* lo que falta.

## Lo que Worky aún no guarda y la factura exige

| Falta | Hoy | Qué hacer |
|---|---|---|
| **Tipo de documento** del cliente | Un solo texto, `documento` | Un selector (cédula, NIT…) en la ficha del contacto. Sin él se supone cédula y se avisa |
| **Dígito de verificación** del NIT | Va dentro del texto si el cliente lo escribió | Pedirlo cuando el tipo sea NIT |
| **Correo y dirección** del cliente | El contacto los tiene a veces | Pedirlos al emitir; el correo permite que Factus envíe la factura |
| **Datos fiscales de la tienda** | Nada | Los guarda Factus al habilitarla; ver «Multi-tienda» |
| **Rango de numeración** | `FAC-A001` de Worky | El de la DIAN es otro, con prefijo autorizado. Worky seguiría llevando su consecutivo y guardaría el de la DIAN al lado |
| **IVA por línea** | 19 % fijo a todo | Para empezar sirve; hay productos excluidos |

## Arquitectura propuesta

Las credenciales **no pueden ir en la app**: el repositorio es público y el
JavaScript del navegador se lee. La conexión va en una función de servidor de
Supabase (`supabase/functions/factura-electronica`) que:

1. Recibe el id de la factura de quien tiene sesión y comprueba que sea suya.
2. Arma el cuerpo con `traducirFactura` (se comparte el módulo, o se porta a la función).
3. Pide el token a Factus, llama a `/v2/bills/validate` y respeta el límite.
4. Guarda el resultado (número DIAN, CUFE, enlaces) en una tabla propia con RLS y lo devuelve.
5. Si Factus falla o la DIAN rechaza, devuelve el motivo en español, nunca un error crudo.

Los secretos van en los secretos de la función, nunca en el repositorio.

## Multi-tienda: la pregunta que decide todo

La autenticación de Factus es por **usuario y contraseña** de una cuenta. Si cada
tienda de Worky debe emitir con **su propio RUT, firma y resolución**, hace falta
saber cómo lo resuelve Factus para una plataforma: una cuenta por tienda, una sola
cuenta de integrador con varias empresas (hay un endpoint de «Empresas»), o marca
blanca. Mientras no se sepa, no se puede decidir dónde se guardan las credenciales ni
cuánto cuesta por tienda. No se escribe la función antes de eso.

## Preguntas para Factus (por WhatsApp)

1. ¿Una cuenta de integrador puede emitir con el RUT, la firma y la resolución de
   **cada tienda**? ¿Cómo se crea cada tienda: por API o a mano?
2. ¿Cuánto cuesta cada documento y quién lo paga, Worky o la tienda? ¿El paquete es
   por cuenta o por empresa?
3. ¿Quién hace la habilitación de cada tienda ante la DIAN: ustedes o ella?
4. ¿Cuánto dura el token, 1 hora o 10 minutos? ¿Se renueva con el `refresh_token`?
5. ¿Hay credenciales de sandbox para empezar a probar ya?

## Fases

1. **Respuestas de Factus** y credenciales de sandbox. *(Pendiente.)*
2. Selector de tipo de documento, correo y dirección en el contacto.
3. La función de servidor y su tabla, probadas contra el sandbox.
4. Botón «Emitir factura electrónica» en la factura, con los supuestos a la vista.
5. Producción, con una sola tienda de prueba antes de abrirlo a todas.

Cobrar por esto es una decisión aparte: ver las notas de planes en
[ESTADO-FUNCIONALIDADES.md](ESTADO-FUNCIONALIDADES.md).
