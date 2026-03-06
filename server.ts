import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.post("/api/analyze-image", async (req, res) => {
    console.log("Received /api/analyze-image request");
    const { base64Image } = req.body;
    if (!base64Image) {
      console.error("No base64Image in request body");
      return res.status(400).json({ error: "Immagine mancante" });
    }
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Sei un esperto di auto. Analizza l'immagine e restituisci i dettagli tecnici in formato JSON."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analizza questa immagine di un'auto con estrema precisione tecnica.
          
REGOLE RIGIDE:
1. TARGA: Se la targa è visibile, leggila. SE LA TARGA È COPERTA, SFOCATA O NON VISIBILE, NON INVENTARLA. In tal caso scrivi null o "Non visibile".
2. MOTORIZZAZIONE: Identifica la versione specifica SOLO SE leggibile sul veicolo (es. badge "420d", "V6", "Turbo"). 
3. DATI TECNICI (Potenza, Motore, Bollo): Fornisci questi dati SOLO SE hai identificato la motorizzazione specifica. Se non è leggibile, scrivi "Non identificabile dalla foto".
4. RICERCA: Usa le tue conoscenze per fornire dati accurati per l'Italia relativi a quel modello e anno specifico.

Identifica:
- Casa costruttrice (Make)
- Modello (Model)
- Serie/Generazione (Series)
- Anno stimato (Year)
- Motorizzazione (Engine) - Solo se identificata
- Bollo (Bollo) - Solo se motorizzazione identificata
- Superbollo (Superbollo) - Solo se motorizzazione identificata
- Targa (License Plate) - NON INVENTARE
- Carrozzeria (Body Type)
- Alimentazione (Fuel Type)
- Cambio (Transmission)
- Potenza (Horsepower) - Solo se motorizzazione identificata
- Valore stimato (Estimated Value)
- Classe ambientale (Euro Class)
- Colore (Color)`
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Image,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "car_details",
            strict: true,
            schema: {
              type: "object",
              properties: {
                make: { type: "string" },
                model: { type: "string" },
                series: { type: "string" },
                year: { type: "string" },
                engine: { type: "string" },
                bollo: { type: "string" },
                superbollo: { type: "string" },
                licensePlate: { type: "string", nullable: true },
                bodyType: { type: "string" },
                fuelType: { type: "string" },
                transmission: { type: "string" },
                horsepower: { type: "string" },
                estimatedValue: { type: "string" },
                euroClass: { type: "string" },
                color: { type: "string" },
              },
              required: ["make", "model", "series", "year", "engine", "bollo", "superbollo", "licensePlate", "bodyType", "fuelType", "transmission", "horsepower", "estimatedValue", "euroClass", "color"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      res.json(JSON.parse(content || "{}"));
    } catch (error: any) {
      console.error("OpenAI Image Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/analyze-plate", async (req, res) => {
    const { plate, portalData } = req.body;
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sei un sistema di verifica targhe professionale."
          },
          {
            role: "user",
            content: `Devi identificare il veicolo con targa italiana: "${plate}".
    
${portalData ? `DATI RECUPERATI (Usa questi come fonte prioritaria): \n\n${portalData}\n\n` : `I dati non sono disponibili. Verifica la targa e trova informazioni reali.`}

REGOLE:
1. Se i dati sopra contengono Marca, Modello, Anno e Cilindrata, usali.
2. Se i dati sono assenti, prova a identificare il veicolo. Se non trovi nulla di certo, scrivi "Veicolo non trovato".
3. Restituisci JSON.`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "car_details",
            strict: true,
            schema: {
              type: "object",
              properties: {
                make: { type: "string" },
                model: { type: "string" },
                series: { type: "string" },
                year: { type: "string" },
                engine: { type: "string" },
                bollo: { type: "string" },
                superbollo: { type: "string" },
                licensePlate: { type: "string" },
                bodyType: { type: "string" },
                fuelType: { type: "string" },
                transmission: { type: "string" },
                horsepower: { type: "string" },
                estimatedValue: { type: "string" },
                euroClass: { type: "string" },
                color: { type: "string" },
              },
              required: ["make", "model", "series", "year", "engine", "bollo", "superbollo", "licensePlate", "bodyType", "fuelType", "transmission", "horsepower", "estimatedValue", "euroClass", "color"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      res.json(JSON.parse(content || "{}"));
    } catch (error: any) {
      console.error("OpenAI Plate Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Catch-all for API routes to debug 404s
  app.all("/api/*", (req, res) => {
    console.warn(`404 API Route Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
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
