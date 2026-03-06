import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from "openai";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64Image } = req.body;
  if (!base64Image) {
    return res.status(400).json({ error: "Immagine mancante" });
  }

  // Check size (approximate)
  const sizeInMB = (base64Image.length * 0.75) / (1024 * 1024);
  if (sizeInMB > 4) {
    return res.status(413).json({ error: "Immagine troppo grande per Vercel (limite 4.5MB). L'app dovrebbe averla compressa automaticamente." });
  }

  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';

  // 1. Gemini
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: IMAGE_PROMPT },
            { inlineData: { data: base64Data, mimeType: mimeType } }
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
      return res.json(JSON.parse(response.text));
    }
  } catch (e) {
    console.warn("Gemini failed, falling back to OpenAI");
  }

  // 2. OpenAI Fallback
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Sei un esperto di auto. Analizza l'immagine e restituisci i dettagli tecnici in formato JSON." },
        { role: "user", content: [{ type: "text", text: IMAGE_PROMPT }, { type: "image_url", image_url: { url: base64Image } }] }
      ],
      response_format: { type: "json_schema", json_schema: { name: "car_details", strict: true, schema: CAR_DETAILS_SCHEMA as any } },
    });
    const content = response.choices[0].message.content;
    return res.json(JSON.parse(content || "{}"));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
