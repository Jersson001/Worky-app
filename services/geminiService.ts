import { GoogleGenAI, Type } from "@google/genai";
import { Message } from "../types";

// Initialize Gemini
// Using a safe accessor for process.env to prevent runtime crashes in strict browser environments
const getApiKey = () => {
  try {
    return process.env.API_KEY || '';
  } catch (e) {
    console.warn("API Key not found in environment");
    return '';
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export const generateSmartReply = async (history: Message[], context: string): Promise<string> => {
  try {
    // Format history for context
    const conversationText = history.map(msg => 
      `${msg.sender === 'me' ? 'Yo (Comerciante)' : 'Cliente'}: ${msg.text}`
    ).join('\n');

    const prompt = `
      Actúa como un asistente comercial profesional. 
      Contexto del negocio: ${context}
      
      Historial de conversación reciente:
      ${conversationText}
      
      Genera una respuesta breve, profesional y orientada a la venta o servicio al cliente para responderle al cliente.
      Solo dame el texto de la respuesta, nada más.
    `;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    return result.text || "";
  } catch (error) {
    console.error("Error generating reply:", error);
    return "Lo siento, no puedo generar una respuesta ahora.";
  }
};

export const extractInvoiceDetails = async (history: Message[]): Promise<any> => {
  try {
    const conversationText = history.map(msg => 
      `${msg.sender === 'me' ? 'Comerciante' : 'Cliente'}: ${msg.text}`
    ).join('\n');

    // Using Type from @google/genai
    const schema = {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              price: { type: Type.NUMBER }
            },
            required: ['description', 'quantity', 'price']
          }
        },
        clientName: { type: Type.STRING }
      },
      required: ['items', 'clientName']
    };

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analiza la siguiente conversación y extrae los detalles para una factura (items, cantidad, precio unitario). Si no hay nombre explícito, usa "Cliente".
      
      Conversación:
      ${conversationText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    return JSON.parse(result.text || "{}");
  } catch (error) {
    console.error("Error extracting invoice:", error);
    return null;
  }
};

export const enhanceProductImage = async (imageBase64: string): Promise<string> => {
  try {
    // Extraer la parte base64 pura (sin el prefijo data:image/...)
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    
    const prompt = `Analiza esta imagen de producto y proporciona una descripción profesional para un catálogo de ventas. 
    Describe el producto de manera atractiva, resaltando sus características principales, estado, y cualquier detalle relevante para un cliente potencial.
    Genera también sugerencias para mejorar la presentación del producto en fotos (iluminación, ángulo, fondo, etc.).`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ]
    });

    return result.text || "Producto de calidad";
  } catch (error) {
    console.error("Error enhancing product image:", error);
    return "Error al analizar la imagen";
  }
};

export const generateProductDescription = async (imageBase64: string, productName?: string): Promise<{
  description: string;
  suggestions: string;
  detectedFeatures: string[];
}> => {
  try {
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        description: { 
          type: Type.STRING,
          description: "Descripción profesional y atractiva del producto"
        },
        suggestions: { 
          type: Type.STRING,
          description: "Sugerencias para mejorar la presentación del producto en fotos"
        },
        detectedFeatures: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Características principales detectadas en la imagen"
        }
      },
      required: ['description', 'suggestions', 'detectedFeatures']
    };

    const prompt = `Analiza esta imagen de producto${productName ? ` llamado "${productName}"` : ''} para un catálogo comercial.

Proporciona:
1. Una descripción profesional y atractiva para vender el producto
2. Sugerencias específicas para mejorar la foto (iluminación, fondo, ángulo, composición)
3. Lista de características principales visibles del producto

Sé específico y profesional, como si fueras un fotógrafo comercial y redactor de catálogos.`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    return JSON.parse(result.text || '{"description": "Producto de calidad", "suggestions": "", "detectedFeatures": []}');
  } catch (error) {
    console.error("Error generating product description:", error);
    return {
      description: "Error al analizar la imagen",
      suggestions: "",
      detectedFeatures: []
    };
  }
};