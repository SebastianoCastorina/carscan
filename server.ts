import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CAR_DETAILS_SCHEMA = {
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
};

const IMAGE_PROMPT = `Analizza questa immagine di un'auto con estrema precisione tecnica.
          
REGOLE DI IDENTIFICAZIONE:
1. TARGA: Se la targa è visibile, leggila. SE LA TARGA È COPERTA, SFOCATA O NON VISIBILE, NON INVENTARLA. In tal caso scrivi null o "Non visibile".
2. MOTORIZZAZIONE E DATI TECNICI: 
   - Se il modello è ICONICO e UNIVOCO (es. Lamborghini Huracán, Ferrari 488, Porsche 911 GT3), fornisci i dati tecnici (CV, kW, Motore, Bollo) basandoti sull'identificazione visiva del modello, anche se non leggi il badge specifico.
   - Per auto comuni (es. BMW Serie 3, Audi A4), identifica la versione specifica SOLO SE leggibile sul veicolo (es. badge "420d", "V6"). Se non è leggibile, scrivi "Non identificabile con certezza dalla foto" nei campi tecnici.
3. RICERCA: Usa le tue conoscenze per fornire dati accurati per l'Italia relativi a quel modello e anno specifico.

Identifica:
- Casa costruttrice (Make)
- Modello (Model)
- Serie/Generazione (Series)
- Anno stimato (Year)
- Motorizzazione (Engine)
- Bollo (Bollo)
- Superbollo (Superbollo)
- Targa (License Plate) - NON INVENTARE
- Carrozzeria (Body Type)
- Alimentazione (Fuel Type)
- Cambio (Transmission)
- Potenza (Horsepower)
- Valore stimato (Estimated Value)
- Classe ambientale (Euro Class)
- Colore (Color)`;

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

    // Estrarre i dati base64 puri per Gemini
    const base64Data = base64Image.split(',')[1] || base64Image;
    const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';

    // 1. Prova con Gemini (Gratuito)
    try {
      console.log("Attempting analysis with Gemini...");
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: IMAGE_PROMPT },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              make: { type: Type.STRING },
              model: { type: Type.STRING },
              series: { type: Type.STRING },
              year: { type: Type.STRING },
              engine: { type: Type.STRING },
              bollo: { type: Type.STRING },
              superbollo: { type: Type.STRING },
              licensePlate: { type: Type.STRING, nullable: true },
              bodyType: { type: Type.STRING },
              fuelType: { type: Type.STRING },
              transmission: { type: Type.STRING },
              horsepower: { type: Type.STRING },
              estimatedValue: { type: Type.STRING },
              euroClass: { type: Type.STRING },
              color: { type: Type.STRING },
            },
            required: ["make", "model", "series", "year", "engine", "bollo", "superbollo", "licensePlate", "bodyType", "fuelType", "transmission", "horsepower", "estimatedValue", "euroClass", "color"],
          }
        }
      });

      if (response.text) {
        console.log("Gemini analysis successful");
        return res.json(JSON.parse(response.text));
      }
    } catch (geminiError: any) {
      console.warn("Gemini analysis failed, falling back to OpenAI:", geminiError.message);
    }

    // 2. Fallback a OpenAI (Pagamento)
    try {
      console.log("Attempting analysis with OpenAI...");
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
                text: IMAGE_PROMPT
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
            schema: CAR_DETAILS_SCHEMA as any,
          },
        },
      });

      const content = response.choices[0].message.content;
      console.log("OpenAI analysis successful");
      res.json(JSON.parse(content || "{}"));
    } catch (error: any) {
      console.error("Both AI models failed:", error);
      res.status(500).json({ error: "Errore durante l'analisi dell'immagine con entrambi i modelli." });
    }
  });

  app.post("/api/analyze-plate", async (req, res) => {
    const { plate, portalData } = req.body;

    const PLATE_PROMPT = `Devi identificare il veicolo con targa italiana: "${plate}".
    
${portalData ? `DATI RECUPERATI (Usa questi come fonte prioritaria): \n\n${portalData}\n\n` : `I dati non sono disponibili. Verifica la targa e trova informazioni reali.`}

REGOLE:
1. Se i dati sopra contengono Marca, Modello, Anno e Cilindrata, usali.
2. Se i dati sono assenti, prova a identificare il veicolo. Se non trovi nulla di certo, scrivi "Veicolo non trovato".
3. Restituisci JSON.`;

    // 1. Prova con Gemini
    try {
      console.log("Attempting plate analysis with Gemini...");
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: PLATE_PROMPT,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              make: { type: Type.STRING },
              model: { type: Type.STRING },
              series: { type: Type.STRING },
              year: { type: Type.STRING },
              engine: { type: Type.STRING },
              bollo: { type: Type.STRING },
              superbollo: { type: Type.STRING },
              licensePlate: { type: Type.STRING },
              bodyType: { type: Type.STRING },
              fuelType: { type: Type.STRING },
              transmission: { type: Type.STRING },
              horsepower: { type: Type.STRING },
              estimatedValue: { type: Type.STRING },
              euroClass: { type: Type.STRING },
              color: { type: Type.STRING },
            },
            required: ["make", "model", "series", "year", "engine", "bollo", "superbollo", "licensePlate", "bodyType", "fuelType", "transmission", "horsepower", "estimatedValue", "euroClass", "color"],
          }
        }
      });

      if (response.text) {
        console.log("Gemini plate analysis successful");
        return res.json(JSON.parse(response.text));
      }
    } catch (geminiError: any) {
      console.warn("Gemini plate analysis failed, falling back to OpenAI:", geminiError.message);
    }
    
    // 2. Fallback a OpenAI
    try {
      console.log("Attempting plate analysis with OpenAI...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sei un sistema di verifica targhe professionale."
          },
          {
            role: "user",
            content: PLATE_PROMPT
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "car_details",
            strict: true,
            schema: CAR_DETAILS_SCHEMA as any,
          },
        },
      });

      const content = response.choices[0].message.content;
      console.log("OpenAI plate analysis successful");
      res.json(JSON.parse(content || "{}"));
    } catch (error: any) {
      console.error("Both AI models failed for plate:", error);
      res.status(500).json({ error: "Errore durante l'analisi della targa con entrambi i modelli." });
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
