/**
 * Proxy de Gemini.
 *
 * La clave vivía en el bundle del cliente (vite.config la incrustaba con
 * `define`), así que cualquiera podía leerla desde las DevTools y gastar la
 * cuota. Aquí se queda en el servidor como secreto de Supabase.
 *
 * El cliente manda { action, ... } y esta función arma el prompt. Además exige
 * un usuario autenticado: sin eso el proxy sería una barra libre para
 * cualquiera que conozca la anon key, que es pública por diseño.
 *
 * Desplegar:  supabase functions deploy gemini
 * Secreto:    supabase secrets set GEMINI_API_KEY=...
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const MODEL = "gemini-2.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

/** Llama a Gemini y devuelve el texto de la respuesta. */
const callGemini = async (parts: GeminiPart[], responseSchema?: unknown): Promise<string> => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts }],
        ...(responseSchema
          ? { generationConfig: { responseMimeType: "application/json", responseSchema } }
          : {}),
      }),
    },
  );

  if (!res.ok) {
    // El cuerpo del error puede traer detalles de la clave: no se propaga al
    // cliente, solo al log de la función.
    console.error("[gemini] respuesta", res.status, await res.text());
    throw new Error(`Gemini respondió ${res.status}`);
  }

  const body = await res.json();
  return body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
};

/** Separa el prefijo data:image/... si viene incluido. */
const toBase64 = (image: string) => image.split(",")[1] || image;

const imageParts = (prompt: string, image: string): GeminiPart[] => [
  { text: prompt },
  { inlineData: { mimeType: "image/jpeg", data: toBase64(image) } },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!GEMINI_API_KEY) {
    console.error("[gemini] falta el secreto GEMINI_API_KEY");
    return json({ error: "El servicio de IA no está configurado." }, 500);
  }

  // Solo usuarios autenticados: la anon key es pública y por sí sola no
  // distingue a un usuario real de cualquiera que la copie del bundle.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "No autorizado." }, 401);

  let payload: Record<string, any>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Cuerpo inválido." }, 400);
  }

  const { action } = payload;

  try {
    switch (action) {
      // ── Respuesta sugerida para el chat ──
      case "smartReply": {
        const { conversation = "", context = "" } = payload;
        const text = await callGemini([{
          text: `Actúa como un asistente comercial profesional.
Contexto del negocio: ${context}

Historial de conversación reciente:
${conversation}

Genera una respuesta breve, profesional y orientada a la venta o servicio al cliente para responderle al cliente.
Solo dame el texto de la respuesta, nada más.`,
        }]);
        return json({ text });
      }

      // ── Extraer ítems de factura desde la conversación ──
      case "invoiceDetails": {
        const { conversation = "" } = payload;
        const schema = {
          type: "OBJECT",
          properties: {
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  description: { type: "STRING" },
                  quantity: { type: "NUMBER" },
                  price: { type: "NUMBER" },
                },
                required: ["description", "quantity", "price"],
              },
            },
            clientName: { type: "STRING" },
          },
          required: ["items", "clientName"],
        };
        const text = await callGemini([{
          text: `Analiza la siguiente conversación y extrae los detalles para una factura (items, cantidad, precio unitario). Si no hay nombre explícito, usa "Cliente".

Conversación:
${conversation}`,
        }], schema);
        return json({ result: JSON.parse(text || "{}") });
      }

      // ── Descripción libre de una foto de producto ──
      case "enhanceImage": {
        const { image = "" } = payload;
        const text = await callGemini(imageParts(
          `Analiza esta imagen de producto y proporciona una descripción profesional para un catálogo de ventas.
Describe el producto de manera atractiva, resaltando sus características principales, estado, y cualquier detalle relevante para un cliente potencial.
Genera también sugerencias para mejorar la presentación del producto en fotos (iluminación, ángulo, fondo, etc.).`,
          image,
        ));
        return json({ text });
      }

      // ── Ficha de catálogo estructurada ──
      case "productDescription": {
        const { image = "", productName } = payload;
        const schema = {
          type: "OBJECT",
          properties: {
            description: { type: "STRING", description: "Descripción profesional y atractiva del producto" },
            suggestions: { type: "STRING", description: "Sugerencias para mejorar la presentación del producto en fotos" },
            detectedFeatures: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Características principales detectadas en la imagen",
            },
          },
          required: ["description", "suggestions", "detectedFeatures"],
        };
        const text = await callGemini(imageParts(
          `Analiza esta imagen de producto${productName ? ` llamado "${productName}"` : ""} para un catálogo comercial.

Proporciona:
1. Una descripción profesional y atractiva para vender el producto
2. Sugerencias específicas para mejorar la foto (iluminación, fondo, ángulo, composición)
3. Lista de características principales visibles del producto

Sé específico y profesional, como si fueras un fotógrafo comercial y redactor de catálogos.`,
          image,
        ), schema);
        return json({ result: JSON.parse(text || "{}") });
      }

      default:
        return json({ error: `Acción desconocida: ${action}` }, 400);
    }
  } catch (error) {
    console.error("[gemini]", action, error);
    return json({ error: "No se pudo procesar la solicitud de IA." }, 502);
  }
});
