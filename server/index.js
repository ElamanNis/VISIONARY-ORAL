import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import { Buffer } from 'node:buffer';
import sharp from 'sharp';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

const PORT = process.env.PORT || 4000;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'visionary-uralsk-backend', timestamp: Date.now() });
});

async function translateToEnglish(text) {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0.2,
      max_tokens: 512,
      messages: [
        { role: 'system', content: 'Translate the user text to concise English suitable for an image generation prompt. Output only the translation.' },
        { role: 'user', content: text }
      ]
    });
    const out = completion.choices?.[0]?.message?.content?.trim();
    if (!out) return null;
    return out;
  } catch {
    return null;
  }
}

app.post('/api/analyze-project', async (req, res) => {
  try {
    const project = req.body?.project;
    if (!project) return res.status(400).json({ error: 'project payload is required' });

    const messages = [
      {
        role: 'system',
        content:
          `You are a helpful assistant that analyzes urban planning projects for the city of Uralsk, Kazakhstan. You must respond strictly in JSON format in Russian. The JSON object must conform to the following schema:
          {
            "ecoImpact": "number",
            "socialUtility": "number",
            "economicGrowth": "number",
            "trafficChange": "number",
            "co2Reduction": "string",
            "jobsCreated": "number",
            "accessibility": "number",
            "infraLoad": "number",
            "costRoi": "string",
            "benefits": "string",
            "detailedAnalysis": "string",
            "recommendations": ["string"],
            "totalRiskSum": "string",
            "risks": [{ "title": "string", "impact": "string", "level": "number" }],
            "economicIndicators": [{ "label": "string", "value": "string", "unit": "string" }]
          }`
      },
      {
        role: 'user',
        content:
          `Проанализируй градостроительный проект для города Уральск (Казахстан):
            Название: ${project.name}
            Тип: ${project.type}
            Масштаб: ${project.scale}
            Стиль: ${project.style}
            Описание: ${project.description}
            Характеристики: ${project.dimensions}
            Координаты: ${project.location?.join(', ')}
            
            Выдай подробный анализ влияния проекта на городскую среду Уральска.
            Особое внимание удели экономическим показателям и рискам реализации.
            Отвечай строго в формате JSON на русском языке.`
      }
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      temperature: 0.2,
      max_tokens: 2048
    });

    let json = completion.choices?.[0]?.message?.content;
    if (!json) return res.status(502).json({ error: 'Empty response from Groq' });
    json = json.trim();
    try {
      const parsed = JSON.parse(json);
      return res.json(parsed);
    } catch (e) {
      // Попытаться извлечь чистый JSON из текста
      const start = json.indexOf('{');
      const end = json.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          const sliced = json.slice(start, end + 1);
          const parsed = JSON.parse(sliced);
          return res.json(parsed);
        } catch (_) { /* fallthrough */ }
      }
      console.error('Groq JSON parse error', e, '\nRaw:', json);
      return res.status(502).json({ error: 'Invalid JSON from Groq' });
    }
  } catch (err) {
    const status = err?.status || err?.response?.status || 500;
    const detail = err?.message || err?.response?.data || 'Failed to analyze project';
    console.error('analyze-project error', status, detail);
    res.status(500).json({ error: 'Failed to analyze project', detail });
  }
});

app.post('/api/generate-visualization', async (req, res) => {
  try {
    const project = req.body?.project;
    const stabilityKey = process.env.STABILITY_API_KEY;
    if (!project?.base64Image) return res.json({ imageUrl: null });
    if (!stabilityKey) return res.status(500).json({ imageUrl: null, error: 'STABILITY_API_KEY is missing' });

    const base64Data = project.base64Image.includes(',') ? project.base64Image.split(',')[1] : project.base64Image;
    const bufferOriginal = Buffer.from(base64Data, 'base64');

    // Normalize to allowed SDXL v1 dimensions (use universal 1024x1024, cover fit)
    let buffer;
    try {
      buffer = await sharp(bufferOriginal)
        .resize(1024, 1024, { fit: 'cover' })
        .png()
        .toBuffer();
    } catch (e) {
      buffer = bufferOriginal;
    }
    const blob = new Blob([buffer], { type: 'image/png' });

    const sourceText = [
      `Type: ${project.type || ''}`,
      `Scale: ${project.scale || ''}`,
      `Style: ${project.style || ''}`,
      `Details: ${project.dimensions || ''}`,
      `Concept: ${project.description || ''}`,
    ].join('\n');
    const translated = await translateToEnglish(sourceText);
    const prompt = translated && translated.length > 0
      ? `Generate a photorealistic architectural visualization based on the provided site photo. ${translated}. Maintain perspective, lighting, and realistic integration with surroundings.`
      : `Generate a photorealistic architectural visualization based on the provided site photo. Type: ${project.type}. Scale: ${project.scale}. Style: ${project.style}. Maintain perspective, lighting, and realistic integration with surroundings.`
    // Use Stability v1 engine image-to-image (SDXL) with normalized 1024x1024
    try {
      const engine = 'stable-diffusion-xl-1024-v1-0';
      const form = new FormData();
      form.append('init_image', blob, 'source.png');
      form.append('image_strength', '0.35');
      form.append('text_prompts[0][text]', prompt);
      form.append('cfg_scale', '7');
      form.append('samples', '1');

      const resp = await fetch(`https://api.stability.ai/v1/generation/${engine}/image-to-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stabilityKey}`,
          Accept: 'application/json',
        },
        body: form
      });
      if (resp.ok) {
        const j = await resp.json();
        const b64 = j?.artifacts?.[0]?.base64;
        if (b64) {
          return res.json({ imageUrl: `data:image/png;base64,${b64}` });
        } else {
          console.warn('Stability v1 no artifacts in response');
        }
      } else {
        const errTxt = await resp.text();
        console.warn('Stability v1 image-to-image error:', resp.status, errTxt);
      }
    } catch (e) {
      console.warn('Stability v1 image-to-image exception:', e?.message || e);
    }

    return res.status(502).json({ imageUrl: null, error: 'Stability API error', detail: 'All endpoints failed (v1 engine with normalized size)' });
  } catch (err) {
    console.error('generate-visualization error', err);
    res.status(500).json({ imageUrl: null });
  }
});

app.listen(PORT, () => {
  console.log(`[visionary-uralsk] backend listening on http://localhost:${PORT}`);
});
