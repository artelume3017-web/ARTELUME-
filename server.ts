import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Handle payload too large (413) gracefully before reaching route handlers
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      error: 'The uploaded file payload is too large. Please upload a compressed catalog PDF or price list under 25MB.',
    });
  }
  next(err);
});

// Initialize GoogleGenAI server-side with User-Agent header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint to parse product catalog / price list PDF or images
app.post('/api/catalog/parse-pdf', async (req, res) => {
  try {
    const { fileData, mimeType, fileName } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel in AI Studio.',
      });
    }

    const cleanBase64 = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    let effectiveMime = mimeType || 'application/pdf';
    if (fileName) {
      const lower = fileName.toLowerCase();
      if (lower.endsWith('.pdf')) effectiveMime = 'application/pdf';
      else if (lower.endsWith('.png')) effectiveMime = 'image/png';
      else if (lower.endsWith('.webp')) effectiveMime = 'image/webp';
      else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) effectiveMime = 'image/jpeg';
    }

    const prompt = `You are a senior architectural lighting engineer and estimating specialist at a luxury lighting design studio (ARTÈ LUME).
Carefully parse this architectural luminaire product catalog / price list document (File: ${fileName || 'catalog.pdf'}).
Extract EVERY single architectural lighting fixture, COB downlight, spotlight, magnetic track luminaire, linear profile, LED strip, wall washer, outdoor luminaire, driver, or accessory listed with its specifications and pricing.

For each fixture, extract the following structured details:
- sku: The model number, factory SKU, or catalog code (e.g., "LFSL1211R-ZT", "AL-DL-COB-12W", "TRK-MAG-24W"). If not explicitly printed, create a logical clean SKU from model name.
- name: Full descriptive name (e.g., "COBLIGHT ZIGBEE 7W TUNABLE", "Deep Regressed Anti-Glare Downlight").
- category: Standard category (choose from: "Downlights", "COB Lights", "Track Lights", "Linear Profiles", "LED Strips", "Wall Sconces", "Pendants", "Outdoor & Inground", "Drivers & Accessories").
- watt: Power rating (e.g., "7W", "12W", "15W", "24W/m").
- cct: Color temperature (e.g., "3000K", "4000K", "2700K-6500K CCT Tunable", "RGBW").
- beam: Optical beam angle (e.g., "15°", "24°", "36°", "60°", "120°").
- cri: Color rendering index (e.g., "CRI 90+", "CRI 95+", "CRI 97").
- ip: Ingress protection rating (e.g., "IP20", "IP44", "IP54", "IP65", "IP68").
- finish: Body / housing finish (e.g., "Matte White", "Matte Black", "Brushed Brass", "Gunmetal", "Anodized Silver").
- reflector: Reflector or secondary optic (e.g., "Specular", "Dark Light", "Rose Gold", "Black Chrome", "White").
- cutout: Cutout dimension or size (e.g., "Ø75mm", "Ø90mm", "100×100mm", "Trimless").
- price: List price or selling price as a pure number (no currency symbols or commas, e.g. 3585). If range, use the base price. If none found, estimate standard retail price in INR (e.g. 2400).
- cost: Purchase / Dealer cost as a number if listed, else estimate based on 50% discount.
- stock: Available or standard initial stock count (default 10).
- descriptionNotes: Any driver specs (Phase-cut, DALI-2, 0-10V, Casambi, Zigbee), chip brand (Bridgelux, Citizen, Cree), or warranty.

Return only a clean JSON array of objects adhering strictly to the schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: effectiveMime,
            data: cleanBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sku: { type: Type.STRING },
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              watt: { type: Type.STRING },
              cct: { type: Type.STRING },
              beam: { type: Type.STRING },
              cri: { type: Type.STRING },
              ip: { type: Type.STRING },
              finish: { type: Type.STRING },
              reflector: { type: Type.STRING },
              cutout: { type: Type.STRING },
              price: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              stock: { type: Type.NUMBER },
              descriptionNotes: { type: Type.STRING },
            },
            required: ['sku', 'name', 'category', 'price'],
          },
        },
      },
    });

    const jsonText = (response.text ?? '[]').trim();
    let parsedProducts = [];
    try {
      parsedProducts = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', parseErr, jsonText);
      return res.status(500).json({ error: 'Failed to parse AI output into structured JSON', raw: jsonText });
    }

    res.json({
      success: true,
      fileName,
      totalCount: parsedProducts.length,
      products: parsedProducts,
    });
  } catch (error: any) {
    console.error('PDF parsing error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to process document with Gemini AI',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mount Vite middleware in dev or static files in production
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ARTÈ LUME Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
