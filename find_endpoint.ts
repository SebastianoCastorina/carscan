import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function findApiEndpoint() {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Qual è l'endpoint API ufficiale per 'InfoTarga' di RS1 Project? Cerca la documentazione API o l'URL base corretto. Potrebbe essere api.infotarga.it, api.infotarga.io, o altro. Restituisci solo l'URL base.",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  console.log(response.text);
}

findApiEndpoint();
