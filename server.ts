import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for InfoTarga Proxy
  app.get("/api/plate/:plate", async (req, res) => {
    const { plate } = req.params;
    const apiKey = process.env.INFOTARGA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "INFOTARGA_API_KEY not configured" });
    }

    try {
      // Updated to use the correct endpoint provided by the user
      // Endpoint: https://api.infotarga.com/v2/query
      // Header: x-api-key
      const response = await axios.get(`https://api.infotarga.com/v2/query`, {
        params: { plate }, // Passing plate as query parameter
        headers: {
          "x-api-key": apiKey
        }
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("InfoTarga API Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: "Failed to fetch data from InfoTarga",
        details: error.response?.data || error.message
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
