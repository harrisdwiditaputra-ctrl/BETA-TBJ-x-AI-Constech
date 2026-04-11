import { GoogleGenAI, Type } from "@google/genai";
import { WORK_ITEMS_MASTER } from "../constants";
import { AIEstimateResponse } from "../types";

const getApiKey = () => {
  const key = process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY is not defined. AI features may not work.");
  }
  return key || "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export async function getAIEstimation(userProblem: string, category: string): Promise<AIEstimateResponse> {
  const masterDataString = WORK_ITEMS_MASTER.map(item => 
    `- ${item.name} (${item.unit}): Rp ${item.price.toLocaleString('id-ID')}`
  ).join('\n');

  const prompt = `
    Anda adalah seorang AI Estimator profesional untuk perusahaan kontraktor TBJ.
    Tugas Anda adalah menganalisa permasalahan konstruksi klien dan memberikan estimasi pekerjaan serta biaya.

    Kategori Proyek: ${category}
    Permasalahan Klien: "${userProblem}"

    Gunakan data harga satuan berikut sebagai referensi utama (jika tidak ada yang cocok, gunakan estimasi pasar yang wajar):
    ${masterDataString}

    Berikan analisa singkat tentang apa yang perlu dilakukan, daftar item pekerjaan (uraian, volume, satuan, harga satuan), dan total biaya.
    Bahasa: Indonesia.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: {
            type: Type.STRING,
            description: "Analisa singkat mengenai permasalahan dan solusi yang diusulkan."
          },
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
                reasoning: { type: Type.STRING, description: "Alasan mengapa item ini diperlukan." }
              },
              required: ["name", "quantity", "unit", "pricePerUnit", "totalPrice", "reasoning"]
            }
          },
          totalEstimatedCost: { type: Type.NUMBER }
        },
        required: ["analysis", "items", "totalEstimatedCost"]
      }
    }
  });

  return JSON.parse(response.text);
}
