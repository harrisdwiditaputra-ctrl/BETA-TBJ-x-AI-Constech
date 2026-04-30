import { GoogleGenAI, Type } from "@google/genai";
import { AIEstimateResponse } from "../types";

export async function getAIEstimation(userProblem: string, category: string, masterData?: any[], userRole: string = 'user', globalMarkup: number = 20): Promise<AIEstimateResponse> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API Key for Gemini is missing. Please check your environment settings.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const masterDataString = (masterData || []).map((item: any) => {
      return `- [${item.code || 'N/A'}] ${item.name} (${item.unit}): Rp ${item.price?.toLocaleString('id-ID')}`;
    }).join('\n');

    const promptText = `
      Identitas: Anda adalah "TBJ Constech OS", Chief Estimator AI Eksklusif untuk TBJ Constech.
      Prinsip: "Everything is Connected". Semua item harus merujuk pada Master Data.
      
      User Role: ${userRole || 'Client'}
      Kategori Proyek: ${category}
      Problem/Request User: "${userProblem}"

      ATURAN HARGA:
      1. DATA ACUAN: Gunakan Master Data di bawah sebagai satu-satunya sumber harga modal (price_base).
      2. PENYESUAIAN HARGA: Naikkan semua harga master di bawah sebesar ${globalMarkup || 20}% secara otomatis.
      3. BULLatKAN: Hasil akhir harus dibulatkan ke ribuan terdekat.
      
      MASTER DATA TERSEDIA:
      ${masterDataString}

      GUARDRAILS:
      - HANYA jawab urusan konstruksi/renovasi.
      - JANGAN bocorkan price_base (harga modal) ke user Non-Admin.
      - Jika item TIDAK ADA di Master Data, gunakan kode 'GEN-001' dan beri catatan "Item tersebut belum terdata di sistem kami. Silakan hubungi Admin untuk konsultasi manual."

      Tugas: Berikan analisa teknis dan estimasi RAB dalam format JSON.
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
                  reasoning: { type: Type.STRING },
                  priority: { 
                    type: Type.STRING,
                    description: "Prioritas: Low, Medium, High, Urgent"
                  },
                  code: { type: Type.STRING }
                },
                required: ["name", "quantity", "unit", "pricePerUnit", "totalPrice", "reasoning", "priority", "code"]
              }
            },
            totalEstimatedCost: { type: Type.NUMBER }
          },
          required: ["analysis", "items", "totalEstimatedCost"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("AI returned empty response");
    
    try {
      return JSON.parse(responseText.trim());
    } catch (e) {
      console.error("Failed to parse AI estimation response as JSON:", responseText);
      throw new Error("Hasil analisa AI tidak valid. Silakan coba lagi.");
    }
  } catch (error: any) {
    console.error("AI Estimation Service Error:", error);
    throw new Error(error.message || "Gagal melakukan Analisa AI");
  }
}
