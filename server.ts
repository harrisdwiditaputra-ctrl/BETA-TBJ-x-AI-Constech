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
        return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
      }

      const genAI = new GoogleGenAI({ apiKey });
      const model = (genAI as any).getGenerativeModel({ model: "gemini-1.5-flash" }); 

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

      const response = JSON.parse(result.response.text());
      res.json(response);
    } catch (error: any) {
      console.error("AI Server Error:", error);
      res.status(500).json({ error: error.message });
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
