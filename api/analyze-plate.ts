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
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plate, portalData } = req.body;

  const PLATE_PROMPT = `Devi identificare il veicolo con targa italiana: "${plate}".
    
${portalData ? `DATI RECUPERATI (Usa questi come fonte prioritaria): \n\n${portalData}\n\n` : `I dati non sono disponibili. Verifica la targa e trova informazioni reali.`}

REGOLE:
1. Se i dati sopra contengono Marca, Modello, Anno e Cilindrata, usali.
2. Se i dati sono assenti, prova a identificare il veicolo. Se non trovi nulla di certo, scrivi "Veicolo non trovato".
3. Restituisci JSON.`;

  // 1. Gemini
  try {
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
      return res.json(JSON.parse(response.text));
    }
  } catch (e) {
    console.warn("Gemini plate analysis failed, falling back to OpenAI");
  }

  // 2. OpenAI Fallback
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sei un sistema di verifica targhe professionale." },
        { role: "user", content: PLATE_PROMPT }
      ],
      response_format: { type: "json_schema", json_schema: { name: "car_details", strict: true, schema: CAR_DETAILS_SCHEMA as any } },
    });
    const content = response.choices[0].message.content;
    return res.json(JSON.parse(content || "{}"));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
