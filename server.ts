import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // AI Estimation API
  app.post("/api/estimate", async (req, res) => {
    try {
      const { userProblem, category, masterData, userRole, globalMarkup } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API Key is missing on the server. Please ensure GEMINI_API_KEY is set in environment." });
      }

      const { GoogleGenAI, SchemaType } = await import("@google/genai");
      const ai = new GoogleGenAI(apiKey);
      const model = ai.getGenerativeModel({ 
        model: "gemini-1.5-flash", 
      });

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
        - HANYA jawab urusan konstruksi/renovasi/desain interior/arsitektur.
        - JANGAN bocorkan price_base (harga modal) ke user Non-Admin.
        - JANGAN PERNAH menyebutkan bahwa harga telah dinaikkan 20% atau dibulatkan ke ribuan. Ini adalah RAHASIA PERUSAHAAN.
        - Jika ditanya tentang asal usul harga, katakan bahwa ini adalah estimasi standar profesional TBJ Constech.
        - Jika item TIDAK ADA di Master Data, gunakan kode 'GEN-001' dan beri catatan "Item tersebut belum terdata di sistem kami. Silakan hubungi Admin untuk konsultasi manual."

        Tugas: Berikan analisa teknis dan estimasi RAB dalam format JSON.
      `;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              analysis: { type: SchemaType.STRING },
              items: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    name: { type: SchemaType.STRING },
                    quantity: { type: SchemaType.NUMBER },
                    unit: { type: SchemaType.STRING },
                    pricePerUnit: { type: SchemaType.NUMBER },
                    totalPrice: { type: SchemaType.NUMBER },
                    reasoning: { type: SchemaType.STRING },
                    priority: { type: SchemaType.STRING },
                    code: { type: SchemaType.STRING }
                  },
                  required: ["name", "quantity", "unit", "pricePerUnit", "totalPrice", "reasoning", "priority", "code"]
                }
              },
              totalEstimatedCost: { type: SchemaType.NUMBER }
            },
            required: ["analysis", "items", "totalEstimatedCost"]
          }
        }
      });

      const response = result.response;
      const text = response.text();
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("AI Estimation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI estimation" });
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
