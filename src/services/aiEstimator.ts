import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { WORK_ITEMS_MASTER } from "../constants";
import { AIEstimateResponse } from "../types";
import { calculateAdminPrice, calculateClientPrice } from "../lib/utils";

export async function getAIEstimation(userProblem: string, category: string, masterData?: any[], userRole: string = 'user', globalMarkup: number = 20): Promise<AIEstimateResponse> {
  try {
    const apiKey = (process.env as any).GEMINI_API_KEY || "";
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing!");
      throw new Error("API Key Gemini tidak ditemukan (GEMINI_API_KEY). Silakan periksa konfigurasi environment.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const markupFactor = 1 + (globalMarkup / 100);
    const masterDataString = (masterData || []).map((item: any) => {
      const adminPrice = item.price * markupFactor;
      return `- [${item.code || 'X000'}] ${item.name} (${item.unit}): Rp ${adminPrice.toLocaleString('id-ID')}`;
    }).slice(0, 161).join('\n');

    const promptText = `
      Anda adalah "TBJ Constech OS", Chief Estimator AI untuk platform TBJ Constech.
      Role Pengguna: ${userRole}
      Kategori: ${category}
      Masalah/Kebutuhan: "${userProblem}"

      DATA REFERENSI (Sudah Markup ${globalMarkup}%):
      ${masterDataString}

      INSTRUKSI:
      1. Berikan analisa teknis mendalam tentang solusi masalah di atas.
      2. Buat estimasi RAB item-per-item berdasarkan DATA REFERENSI. 
      3. Jika item tidak ada di data referensi, gunakan asumsi harga pasar yang wajar.
      4. Hitung totalEstimatedCost sebagai jumlah dari semua totalPrice item.
      5. Kembalikan response HANYA dalam format JSON sesuai schema.

      SCHEMA JSON:
      {
        "analysis": "string",
        "items": [
          { "name": "string", "quantity": number, "unit": "string", "pricePerUnit": number, "totalPrice": number, "reasoning": "string" }
        ],
        "totalEstimatedCost": number
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  pricePerUnit: { type: Type.NUMBER },
                  totalPrice: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING }
                }
              }
            },
            totalEstimatedCost: { type: Type.NUMBER }
          }
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Estimation Service Error:", error);
    throw new Error(error.message || "Gagal melakukan Analisa AI");
  }
}
