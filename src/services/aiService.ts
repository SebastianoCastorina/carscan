export interface CarDetails {
  make: string;
  model: string;
  series: string;
  year: string;
  engine: string;
  bollo: string;
  superbollo: string;
  licensePlate: string | null;
  bodyType: string;
  fuelType: string;
  transmission: string;
  horsepower: string;
  estimatedValue: string;
  euroClass: string;
  color: string;
  technicalNotes?: string;
}

export async function analyzeCarImage(base64Image: string, retries = 3): Promise<CarDetails> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ base64Image }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante l'analisi dell'immagine");
      }

      return await response.json() as CarDetails;
    } catch (error: any) {
      console.error(`Tentativo ${attempt + 1} fallito per l'immagine:`, error);
      if (attempt === retries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Impossibile analizzare l'immagine dopo vari tentativi");
}

export async function analyzeLicensePlate(plate: string, retries = 3): Promise<CarDetails> {
  let portalData = "";

  // 1. Prova il Portale dell'Automobilista (vecchio metodo)
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

  // 2. Chiama il backend per l'analisi OpenAI
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch("/api/analyze-plate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plate, portalData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore durante l'analisi della targa");
      }

      return await response.json() as CarDetails;
    } catch (error: any) {
      console.error(`Tentativo ${attempt + 1} fallito per la targa:`, error);
      if (attempt === retries - 1) throw error;
      const delay = Math.pow(2, attempt) * 1500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Impossibile analizzare la targa dopo vari tentativi");
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
