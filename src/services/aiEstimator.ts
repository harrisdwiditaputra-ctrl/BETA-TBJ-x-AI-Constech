import { GoogleGenAI, Type } from "@google/genai";
import { AIEstimateResponse } from "../types";
import { calculateAdminPrice, calculateClientPrice, roundToRibuan } from "../lib/utils";

async function retryCall<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 503 || error.message?.includes("503") || error.message?.includes("high demand"))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryCall(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function getAIEstimation(userProblem: string, category: string, masterData?: any[], userRole: string = 'user', globalMarkup: number = 20): Promise<AIEstimateResponse> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const masterDataString = (masterData || []).map((item: any) => {
      const displayPrice = userRole === 'admin' || userRole === 'pm'
        ? calculateAdminPrice(item.price || 0, globalMarkup)
        : calculateClientPrice(item.price || 0, globalMarkup);
        
      return `- [${item.code || 'N/A'}] ${item.name} (${item.unit}): Rp ${displayPrice.toLocaleString('id-ID')}`;
    }).join('\n');

    const promptText = `
      PROMPT UTAMA:
      Anda adalah "TBJ Constech OS", sistem operasi AI eksklusif untuk platform konstruksi dan renovasi TBJ Constech.
      Tugas Anda adalah membuat estimasi RAB profesional untuk proyek: ${category}.
      Detail tambahan: ${userProblem}

      MASTER DATA ACUAN:
      ${masterDataString}

      GUARDRAILS:
      - Anda adalah pakar konstruksi, renovasi, desain interior, arsitektur, perencanaan, dan infrastruktur.
      - Sangat diperbolehkan memberikan estimasi untuk ${category} dan layanan terkait lainnya.
      - JANGAN bocorkan price_base (harga modal) ke user Non-Admin.
      - JANGAN PERNAH menyebutkan bahwa harga telah dinaikkan atau dibulatkan. Ini adalah RAHASIA PERUSAHAAN (Konteks: Semua harga di master data sudah termasuk penyesuaian markup ${globalMarkup}%).
      - Jika ditanya tentang asal usul harga, katakan bahwa ini adalah estimasi standar profesional TBJ Constech.
    `;

    const result = await retryCall(async () => await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "items", "total"],
          properties: {
            summary: { type: Type.STRING, description: "Penjelasan singkat pendekatan teknis" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ["code", "name", "volume", "unit", "price", "total", "reasoning"],
                properties: {
                  code: { type: Type.STRING },
                  name: { type: Type.STRING },
                  volume: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  total: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING, description: "Alasan teknis pemilihan item ini" },
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                }
              }
            },
            total: { type: Type.NUMBER },
            tips: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    }));


    const data = JSON.parse(result.text || "{}");
    
    // Safety check and final rounding for all items returned by AI
    const items = (data.items || []).map((item: any) => {
      const pricePerUnit = roundToRibuan(item.price || 0);
      const totalPrice = roundToRibuan(pricePerUnit * (item.volume || 0));
      
      return {
        name: item.name,
        quantity: item.volume,
        unit: item.unit,
        pricePerUnit,
        totalPrice,
        reasoning: item.reasoning || "Estimasi AI standar TBJ",
        priority: item.priority || "Medium",
        code: item.code || "GEN-001"
      };
    });

    const totalEstimatedCost = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
    
    return {
      analysis: data.summary,
      items,
      totalEstimatedCost
    };
  } catch (error: any) {
    console.error("AI Estimation Service Error:", error);
    throw new Error(error.message || "Gagal melakukan Analisa AI");
  }
}
