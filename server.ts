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

  // Logging API
  app.post("/api/logs", async (req, res) => {
    const { userId, action, details } = req.body;
    console.log(`[ACTIVITY LOG] User: ${userId} | Action: ${action} | Details: ${JSON.stringify(details)}`);
    res.json({ success: true });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Final catch-all for any unhandled requests to avoid raw 404s
  app.use((req, res) => {
    if (process.env.NODE_ENV === "production") {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    } else {
      res.status(404).send("Not Found - TBJ OS Engine");
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TBJ Constech OS running on http://localhost:${PORT}`);
  });
}

startServer();
