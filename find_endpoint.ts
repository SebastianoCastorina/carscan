import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function findApiEndpoint() {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: "Qual è l'endpoint API ufficiale per 'InfoTarga' di RS1 Project? Cerca la documentazione API o l'URL base corretto. Potrebbe essere api.infotarga.it, api.infotarga.io, o altro. Restituisci solo l'URL base."
      }
    ]
  });

  console.log(response.choices[0].message.content);
}

findApiEndpoint();
