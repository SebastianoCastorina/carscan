import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface CarDetails {
  make: string;
  model: string;
  series: string;
  year: string;
  engine: string;
  bollo: string;
  superbollo: string;
  licensePlate: string | null;
}

export async function analyzeCarImage(base64Image: string): Promise<CarDetails> {
  const mimeType = base64Image.substring(
    base64Image.indexOf(":") + 1,
    base64Image.indexOf(";")
  );
  const base64Data = base64Image.split(",")[1];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: `Analizza questa immagine di un'auto. FAI UNO SFORZO ESTREMO PER LEGGERE LA TARGA, anche se è sfocata, in prospettiva, buia o parzialmente coperta. Il formato italiano standard è AA000AA. Se alcuni caratteri sono illeggibili, usa un punto interrogativo (es. AB1??CD).
Identifica i seguenti dettagli:
- Casa costruttrice (Make)
- Modello (Model)
- Serie/Generazione (Series)
- Anno stimato (Year)
- Motorizzazione probabile (Engine)
- Prezzo stimato del bollo auto in Italia (Bollo)
- Prezzo stimato del superbollo in Italia, se applicabile (Superbollo)
- Numero di targa (License Plate) - FONDAMENTALE

Restituisci il risultato in formato JSON. Se un dato non è disponibile, usa "Non disponibile".`,
        },
      ],
    },
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
        },
        required: ["make", "model", "series", "year", "engine", "bollo", "superbollo"],
      },
    },
  });

  if (!response.text) {
    throw new Error("Nessuna risposta dal modello");
  }

  return JSON.parse(response.text) as CarDetails;
}

export async function analyzeLicensePlate(plate: string): Promise<CarDetails> {
  let portalData = "";
  
  // Try to use a free public API for Italian license plates first
  try {
    // Note: Many free APIs are unreliable or have strict CORS/rate limits.
    // We'll try to use a proxy or a known working endpoint if possible, 
    // but fallback to Gemini if it fails.
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.ilportaledellautomobilista.it/web/portale-automobilista/verifica-classe-ambientale-veicolo?p_p_id=VerificaClasseAmbientale_WAR_VerificaClasseAmbientale100SNAPSHOT&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=verificaTarga&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_count=1&_VerificaClasseAmbientale_WAR_VerificaClasseAmbientale100SNAPSHOT_tipoVeicolo=1&_VerificaClasseAmbientale_WAR_VerificaClasseAmbientale100SNAPSHOT_targa=${plate}`)}`);
    
    if (response.ok) {
      const data = await response.json();
      const html = data.contents;
      
      // Very basic scraping attempt if the portal returns HTML
      if (html && html.includes("Dati Veicolo")) {
         portalData = html;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch from public registry, falling back to Gemini", e);
  }

  // Fallback to Gemini with a very specific prompt to search the web
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", 
    contents: `Sei un sistema di verifica targhe. Devi trovare a quale veicolo corrisponde la targa italiana: "${plate}".
    
${portalData ? `Dati estratti dal Ministero: \n\n${portalData}\n\nUsa questi dati per identificare il veicolo.` : `Usa lo strumento googleSearch per cercare "targa ${plate}" o "${plate}" sul web.`}

REGOLE FONDAMENTALI (PENA IL FALLIMENTO):
1. Se trovi prove CERTE del veicolo associato a questa targa, restituisci i suoi dati.
2. Se NON trovi prove certe, NON INVENTARE NULLA. È illegale inventare dati di targhe. Devi restituire un JSON con il campo 'make' impostato ESATTAMENTE a "Veicolo non trovato" e gli altri campi "N/D".

Restituisci ESATTAMENTE un oggetto JSON (senza markdown blocks, solo raw JSON) con i seguenti campi:
- make: Casa costruttrice (es. "BMW") o "Veicolo non trovato"
- model: Modello (es. "Serie 1")
- series: Serie/Generazione
- year: Anno di immatricolazione
- engine: Motorizzazione
- bollo: Prezzo stimato bollo
- superbollo: Prezzo stimato superbollo
- licensePlate: "${plate.toUpperCase()}"`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  if (!response.text) {
    throw new Error("Nessuna risposta dal modello per la targa");
  }

  try {
    const text = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(text) as CarDetails;
  } catch (e) {
    console.error("Failed to parse JSON for plate", e, response.text);
    throw new Error("Errore nel parsing dei dati della targa");
  }
}

export interface Listing {
  title: string;
  url: string;
  source: string;
  description: string;
}

export async function findSimilarCars(make: string, model: string, series: string): Promise<Listing[]> {
  // Invece di usare l'IA che trova annunci vecchi e scaduti (link rotti),
  // generiamo i link diretti alle ricerche live sui portali principali.
  // Questo garantisce che i risultati siano sempre aggiornati e funzionanti.
  
  const makeFormatted = make.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const modelFormatted = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const query = encodeURIComponent(`${make} ${model} ${series}`.trim());

  return [
    {
      title: `Cerca ${make} ${model} su AutoScout24`,
      source: "AutoScout24",
      url: `https://www.autoscout24.it/lst/${makeFormatted}/${modelFormatted}`,
      description: "Vedi tutti gli annunci attualmente attivi e disponibili in Italia su AutoScout24."
    },
    {
      title: `Cerca ${make} ${model} su Subito.it`,
      source: "Subito.it",
      url: `https://www.subito.it/annunci-italia/vendita/auto/?q=${query}`,
      description: "Trova occasioni da privati e concessionari nella tua zona su Subito.it."
    }
  ];
}
