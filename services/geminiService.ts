/**
 * Cliente de las funciones de IA.
 *
 * Antes hablaba con Gemini directamente, lo que obligaba a incrustar la clave
 * en el bundle: en la web cualquiera la leía desde las DevTools. Ahora todo
 * pasa por la Edge Function `gemini`, que guarda la clave en el servidor.
 *
 * Las firmas no cambian; los prompts viven ahora en la función.
 */
import { supabase } from './supabaseConfig';
import { Message } from "../types";

/** Invoca la Edge Function. Devuelve null si algo falla (ya registrado). */
const invokeGemini = async <T>(body: Record<string, unknown>): Promise<T | null> => {
  const { data, error } = await supabase.functions.invoke('gemini', { body });

  if (error) {
    console.error(`Error en IA (${body.action}):`, error);
    return null;
  }
  if (data?.error) {
    console.error(`Error en IA (${body.action}):`, data.error);
    return null;
  }
  return data as T;
};

const asConversation = (history: Message[], meLabel: string): string =>
  history
    .map(msg => `${msg.sender === 'me' ? meLabel : 'Cliente'}: ${msg.text}`)
    .join('\n');

export const generateSmartReply = async (history: Message[], context: string): Promise<string> => {
  const data = await invokeGemini<{ text: string }>({
    action: 'smartReply',
    conversation: asConversation(history, 'Yo (Comerciante)'),
    context,
  });
  return data?.text || "Lo siento, no puedo generar una respuesta ahora.";
};

export const extractInvoiceDetails = async (history: Message[]): Promise<any> => {
  const data = await invokeGemini<{ result: any }>({
    action: 'invoiceDetails',
    conversation: asConversation(history, 'Comerciante'),
  });
  return data?.result ?? null;
};

export const enhanceProductImage = async (imageBase64: string): Promise<string> => {
  const data = await invokeGemini<{ text: string }>({
    action: 'enhanceImage',
    image: imageBase64,
  });
  return data?.text || "Error al analizar la imagen";
};

export const generateProductDescription = async (imageBase64: string, productName?: string): Promise<{
  description: string;
  suggestions: string;
  detectedFeatures: string[];
}> => {
  const data = await invokeGemini<{
    result: { description: string; suggestions: string; detectedFeatures: string[] };
  }>({
    action: 'productDescription',
    image: imageBase64,
    productName,
  });

  return data?.result ?? {
    description: "Error al analizar la imagen",
    suggestions: "",
    detectedFeatures: [],
  };
};
