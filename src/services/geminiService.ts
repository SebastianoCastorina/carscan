import { GoogleGenAI, Type } from "@google/genai";

// Supporta sia l'ambiente locale (Vite) che quello cloud
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey as string });

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
    // INSERITO IL MODELLO CORRETTO: gemini-1.5-flash
   model: "gemini-3-flash", 
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          // ISTRUZIONI AGGIORNATE: Solo riconoscimento visivo, niente targa!
          text: `Analizza questa immagine di un'auto. Identifica visivamente il veicolo basandoti ESCLUSIVAMENTE sul design, la carrozzeria, i fari e gli eventuali loghi visibili. IGNORA completamente l'eventuale targa presente.
Identifica i seguenti dettagli:
- Casa costruttrice (Make)
- Modello (Model)
- Serie/Generazione (Series)
- Anno di produzione stimato dal design (Year)
- Motorizzazione probabile (Engine)
- Prezzo stimato del bollo auto in Italia (Bollo)
- Prezzo stimato del superbollo in Italia, se applicabile (Superbollo)

Imposta SEMPRE il campo "licensePlate" a null.
Restituisci il risultato in formato JSON. Se un dato non è chiaramente deducibile dall'immagine, usa "Non disponibile".`,
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
          licensePlate: { type: Type.STRING, nullable: true }, // Accetta null
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
  let infoTargaData: any = null;

  // 1. Prova a usare l'API di InfoTarga tramite il nostro proxy server
  try {
    const response = await fetch(`/api/plate/${plate.toUpperCase()}`);
    if (response.ok) {
      infoTargaData = await response.json();
      portalData = JSON.stringify(infoTargaData);
    }
  } catch (e) {
    console.warn("Failed to fetch from InfoTarga API proxy", e);
  }

  // 2. Se InfoTarga ha fallito, prova il Portale dell'Automobilista (vecchio metodo)
  if (!portalData) {
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.ilportaledellautomobilista.it/web/portale-automobilista/verifica-classe-ambientale-veicolo?p_p_id=VerificaClasseAmbientale_WAR_VerificaClasseAmbientale100SNAPSHOT&_VerificaClasseAmbientale_WAR_VerificaClasseAmbientale100SNAPSHOT_tipoVeicolo=1&_VerificaClasseAmbientale_WAR_VerificaClasseAmbientale100SNAPSHOT_targa=${plate}`)}`);

      if (response.ok) {
        const data = await response.json();
        const html = data.contents;
        if (html && html.includes("Dati Veicolo")) {
          portalData = html;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch from public registry proxy", e);
    }
  }

  // 3. Fallback a Gemini per interpretare i dati o cercare sul web
  const response = await ai.models.generateContent({
 model: "gemini-3-flash",
    contents: `Sei un sistema di verifica targhe professionale. Devi identificare il veicolo con targa italiana: "${plate}".
    
${portalData ? `DATI RECUPERATI (Usa questi come fonte prioritaria): \n\n${portalData}\n\n` : `Usa lo strumento googleSearch per cercare "targa ${plate}" o "${plate}" sul web.`}

REGOLE:
1. Se i dati sopra contengono Marca, Modello, Anno e Cilindrata, usali.
2. Se i dati sono assenti, cerca sul web.
3. Se non trovi nulla di certo, restituisci 'Veicolo non trovato'.

Restituisci ESATTAMENTE un oggetto JSON (senza markdown blocks, solo raw JSON) con i seguenti campi:
- make: Casa costruttrice (es. "BMW") o "Veicolo non trovato"
- model: Modello (es. "Serie 1")
- series: Serie/Generazione
- year: Anno di immatricolazione
- engine: Motorizzazione (es. "2.0 Diesel 150CV")
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
  price?: string;
  imageUrl?: string;
  mileage?: string;
}

export interface SearchFilters {
  priceMin?: string;
  priceMax?: string;
  mileageMax?: string;
  sellerType?: 'all' | 'private' | 'dealer';
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'date_desc';
}

export async function findSimilarCars(make: string, model: string, series: string, year?: string, filters?: SearchFilters): Promise<Listing[]> {
  const cleanMake = make.toLowerCase();
  let cleanModel = model.replace(new RegExp(`^${cleanMake}\\s+`, 'i'), '').trim();

  let searchQuery = cleanModel;
  searchQuery = searchQuery.replace(/[()]/g, '').trim();

  const noiseWords = [/facelift/gi, /restyling/gi, /lci/gi];
  noiseWords.forEach(regex => {
    searchQuery = searchQuery.replace(regex, '');
  });
  searchQuery = searchQuery.replace(/\s+/g, ' ').trim();

  const query = `${make} ${searchQuery} ${year || ''}`.trim();

  // Costruiamo i link di ricerca generici (sempre funzionanti)
  const makeFormatted = make.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // AutoScout24 URL construction
  let asSort = 'standard';
  if (filters?.sortBy === 'price_asc') asSort = 'price';
  if (filters?.sortBy === 'price_desc') asSort = '-price';
  if (filters?.sortBy === 'date_desc') asSort = 'age';

  let autoScoutUrl = `https://www.autoscout24.it/lst/${makeFormatted}?version=${encodeURIComponent(searchQuery)}&ustate=N,U&sort=${asSort}&desc=0&cy=I`;

  if (year && !isNaN(parseInt(year))) {
    autoScoutUrl += `&fregfrom=${year}&fregto=${year}`;
  }
  if (filters?.priceMin) autoScoutUrl += `&pricefrom=${filters.priceMin}`;
  if (filters?.priceMax) autoScoutUrl += `&priceto=${filters.priceMax}`;
  if (filters?.mileageMax) autoScoutUrl += `&kmto=${filters.mileageMax}`;
  if (filters?.sellerType === 'private') autoScoutUrl += `&custtype=P`;
  if (filters?.sellerType === 'dealer') autoScoutUrl += `&custtype=D`;

  // Subito.it URL construction
  let subitoQuery = `${make} ${searchQuery}`;
  if (year && !isNaN(parseInt(year))) {
    subitoQuery += ` ${year}`;
  }
  let subitoUrl = `https://www.subito.it/annunci-italia/vendita/auto/?q=${encodeURIComponent(subitoQuery.trim())}`;

  if (filters?.priceMin) subitoUrl += `&ps=${filters.priceMin}`;
  if (filters?.priceMax) subitoUrl += `&pe=${filters.priceMax}`;
  if (filters?.mileageMax) subitoUrl += `&me=${filters.mileageMax}`;
  if (filters?.sellerType === 'private') subitoUrl += `&seller=private`;
  if (filters?.sellerType === 'dealer') subitoUrl += `&seller=company`;

  if (filters?.sortBy === 'price_asc') subitoUrl += `&order=priceasc`;
  if (filters?.sortBy === 'price_desc') subitoUrl += `&order=pricedesc`;
  if (filters?.sortBy === 'date_desc') subitoUrl += `&order=date`;

  // AutoUncle URL construction
  let autoUncleUrl = `https://www.autouncle.it/it/auto-usate?q=${encodeURIComponent(make + ' ' + searchQuery)}`;
  if (filters?.priceMin) autoUncleUrl += `&min_price=${filters.priceMin}`;
  if (filters?.priceMax) autoUncleUrl += `&max_price=${filters.priceMax}`;
  if (year && !isNaN(parseInt(year))) {
    autoUncleUrl += `&min_year=${year}&max_year=${year}`;
  }

  // Facebook Marketplace URL construction
  let fbUrl = `https://www.facebook.com/marketplace/category/cars?query=${encodeURIComponent(make + ' ' + searchQuery)}`;
  if (filters?.priceMin) fbUrl += `&minPrice=${filters.priceMin}`;
  if (filters?.priceMax) fbUrl += `&maxPrice=${filters.priceMax}`;

  // Google Search URL construction
  let googleUrl = `https://www.google.it/search?q=${encodeURIComponent('comprare ' + make + ' ' + searchQuery + ' ' + (year || '') + ' usata')}`;

  // Quattroruote URL construction
  let quattroruoteUrl = `https://www.quattroruote.it/auto-usate/ricerca?q=${encodeURIComponent(make + ' ' + searchQuery)}`;
  if (filters?.priceMin) quattroruoteUrl += `&prezzo_da=${filters.priceMin}`;
  if (filters?.priceMax) quattroruoteUrl += `&prezzo_a=${filters.priceMax}`;

  // Trovit URL construction
  let trovitUrl = `https://auto.trovit.it/auto-usate/${encodeURIComponent(make + '-' + searchQuery.replace(/\s+/g, '-'))}`;
  if (filters?.priceMin) trovitUrl += `?price_min=${filters.priceMin}`;
  if (filters?.priceMax) trovitUrl += `${filters?.priceMin ? '&' : '?'}price_max=${filters.priceMax}`;

  // Mitula URL construction
  let mitulaUrl = `https://auto.mitula.it/auto/${encodeURIComponent(make + '-' + searchQuery.replace(/\s+/g, '-'))}`;

  // Bakeca URL construction
  let bakecaUrl = `https://www.bakeca.it/annunci/auto/?keyword=${encodeURIComponent(make + ' ' + searchQuery)}`;
  if (filters?.priceMin) bakecaUrl += `&prezzo_da=${filters.priceMin}`;
  if (filters?.priceMax) bakecaUrl += `&prezzo_a=${filters.priceMax}`;

  // AlVolante URL construction
  let alVolanteUrl = `https://www.alvolante.it/listino_auto/usato/${encodeURIComponent(make.toLowerCase())}/${encodeURIComponent(searchQuery.replace(/\s+/g, '-').toLowerCase())}`;

  const genericLinks: Listing[] = [
    {
      title: `Vedi annunci per ${make} ${searchQuery} ${year ? `(${year})` : ''}`,
      source: "AutoScout24",
      url: autoScoutUrl,
      description: "Il più grande portale europeo. Ricerca diretta con i filtri applicati."
    },
    {
      title: `Vedi annunci per ${make} ${searchQuery} ${year ? `(${year})` : ''}`,
      source: "Subito.it",
      url: subitoUrl,
      description: "Il principale sito di annunci in Italia. Ricerca diretta con i filtri applicati."
    },
    {
      title: `Vedi annunci per ${make} ${searchQuery} ${year ? `(${year})` : ''}`,
      source: "Bakeca.it",
      url: bakecaUrl,
      description: "Sito di annunci gratuiti con una vasta sezione dedicata ai motori."
    },
    {
      title: `Cerca sul Web`,
      source: "Google Search",
      url: googleUrl,
      description: "Cerca su Google per trovare concessionari locali e altri portali minori."
    }
  ];

  // Rimuoviamo la chiamata a Gemini per cercare annunci specifici perché:
  // 1. Gli annunci inventati (allucinazioni) frustrano l'utente
  // 2. Gli annunci reali scadono troppo in fretta
  // 3. Evitiamo errori di "permission denied" con il tool googleSearch

  return genericLinks;
}
