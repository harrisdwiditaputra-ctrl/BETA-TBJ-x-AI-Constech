import { GoogleGenAI, Type as GenType } from "@google/genai";
import { WORK_ITEMS_MASTER } from "../constants";
import { AIEstimateResponse } from "../types";
import { calculateAdminPrice, calculateClientPrice } from "../lib/utils";

export async function getAIEstimation(userProblem: string, category: string, masterData?: any[], userRole: string = 'user', globalMarkup: number = 20): Promise<AIEstimateResponse> {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("VITE_GEMINI_API_KEY is missing! Using backend fallback or throwing error.");
      throw new Error("API Key Gemini tidak ditemukan (VITE_GEMINI_API_KEY). Silakan periksa konfigurasi environment.");
    }

    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const masterDataString = (masterData || []).map((item: any) => {
      return `- [${item.code || 'N/A'}] ${item.name} (${item.unit}): Rp ${item.price?.toLocaleString('id-ID')}`;
    }).join('\n');

    const promptText = `
      Anda adalah "TBJ Constech OS", Chief Estimator AI untuk platform TBJ Constech.
      User Role: ${userRole}
      Kategori Proyek: ${category}
      Problem: "${userProblem}"

      DATA MASTER (Markup ${globalMarkup}%):
      ${masterDataString}

      Tugas: Berikan analisa teknis dan estimasi RAB dalam format JSON.
      Response must be ONLY JSON.
    `;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: GenType.OBJECT,
          properties: {
            analysis: { type: GenType.STRING },
            items: {
              type: GenType.ARRAY,
              items: {
                type: GenType.OBJECT,
                properties: {
                  name: { type: GenType.STRING },
                  quantity: { type: GenType.NUMBER },
                  unit: { type: GenType.STRING },
                  pricePerUnit: { type: GenType.NUMBER },
                  totalPrice: { type: GenType.NUMBER },
                  reasoning: { type: GenType.STRING }
                },
                required: ["name", "quantity", "unit", "pricePerUnit", "totalPrice", "reasoning"]
              }
            },
            totalEstimatedCost: { type: GenType.NUMBER }
          },
          required: ["analysis", "items", "totalEstimatedCost"]
        }
      }
    });

    const text = result.response.text();
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Estimation Service Error:", error);
    throw new Error(error.message || "Gagal melakukan Analisa AI");
  }
}
