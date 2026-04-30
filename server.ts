import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import { GoogleGenAI, Type as GenType } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for AI Estimation (Securely hides GEMINI_API_KEY)
  app.post("/api/ai-estimation", async (req, res) => {
    try {
      const { userProblem, category, masterData, userRole, globalMarkup } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is missing on server environment");
        return res.status(500).json({ error: "Layanan AI sedang tidak tersedia (Konfigurasi Server Error)" });
      }

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

      const ai = new GoogleGenAI({ apiKey });
      const aiResponse = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: promptText,
        config: {
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
                    reasoning: { type: GenType.STRING },
                    priority: { 
                      type: GenType.STRING,
                      description: "Prioritas: Low, Medium, High, Urgent"
                    },
                    code: { type: GenType.STRING }
                  },
                  required: ["name", "quantity", "unit", "pricePerUnit", "totalPrice", "reasoning", "priority", "code"]
                }
              },
              totalEstimatedCost: { type: GenType.NUMBER }
            },
            required: ["analysis", "items", "totalEstimatedCost"]
          }
        }
      });

      const responseText = aiResponse.text;
      let response;
      try {
        response = JSON.parse(responseText || "{}");
      } catch (parseError) {
        console.error("AI Parse Error:", responseText);
        return res.status(500).json({ error: "Gagal memproses format data AI. Silakan coba lagi." });
      }
      res.json(response);
    } catch (error: any) {
      console.error("AI Estimation Server Error:", error);
      res.status(500).json({ 
        error: "Gagal memproses estimasi AI.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  });

  // API Route for AI Chat (AIAgent)
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { prompt, image, userContext } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error("GEMINI_API_KEY is missing on server environment");
        return res.status(500).json({ error: "Layanan AI sedang tidak tersedia (Konfigurasi Server Error)" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({ 
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `Anda adalah "TBJ Constech OS". Sistem Operasi AI eksklusif TBJ Constech. 
          Anda bertindak sebagai Manajer Proyek dan Estimator. 
          HANYA jawab pertanyaan seputar konstruksi, renovasi, dan layanan TBJ Constech.
          Gunakan nada bicara profesional, teknis, namun solutif.
          Context: ${JSON.stringify(userContext || {})}`
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("AI Chat Server Error:", error);
      res.status(500).json({ error: "Gagal memproses permintaan AI" });
    }
  });

  // Logging API
  app.post("/api/logs", async (req, res) => {
    // In a real app, you'd write to Firestore here too if using Admin SDK
    // But we can also just log to console or return success
    const { userId, action, details } = req.body;
    console.log(`[ACTIVITY LOG] User: ${userId} | Action: ${action} | Details: ${JSON.stringify(details)}`);
    res.json({ success: true });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TBJ Constech OS running on http://localhost:${PORT}`);
  });
}

startServer();
