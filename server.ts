import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Nuova rotta API che usa RapidAPI (Informazioni Targhe)
  app.get("/api/plate/:plate", async (req, res) => {
    const { plate } = req.params;
    const rapidApiKey = process.env.RAPIDAPI_KEY;

    // Controllo di sicurezza: verifichiamo che la chiave esista
    if (!rapidApiKey) {
      return res.status(500).json({ error: "RAPIDAPI_KEY non configurata nel file .env" });
    }

    try {
      // Facciamo la richiesta POST all'endpoint di RapidAPI che ci hai mostrato
      const response = await axios.post(
        'https://informazioni-targhe.p.rapidapi.com/job/submitWithTheftVerification',
        {
          targhe: [plate], // Passiamo la targa ricevuta dal frontend
          cp: "rm"         // Parametro preso dalla documentazione RapidAPI
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-rapidapi-host': 'informazioni-targhe.p.rapidapi.com',
            'x-rapidapi-key': rapidApiKey
          }
        }
      );

      // Inviamo la risposta di RapidAPI al nostro frontend
      res.json(response.data);
      
    } catch (error: any) {
      console.error("Errore RapidAPI:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({
        error: "Errore durante la comunicazione con RapidAPI",
        details: error.response?.data || error.message
      });
    }
  });

  // Configurazione Vite per l'ambiente di sviluppo
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
    console.log(`Server in esecuzione su http://localhost:${PORT}`);
  });
}

startServer();