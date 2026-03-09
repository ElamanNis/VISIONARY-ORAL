import Groq from 'groq-sdk';
import sharp from 'sharp';
import { Buffer } from 'node:buffer';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
    return out || null;
  } catch {
    return null;
  }
}

export async function analyzeProjectImpl(project) {
  const messages = [
    {
      role: 'system',
      content: `You are a helpful assistant that analyzes urban planning projects for the city of Uralsk, Kazakhstan. You must respond strictly in JSON format in Russian. The JSON object must conform to the following schema:
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
      content: `Проанализируй градостроительный проект для города Уральск (Казахстан):
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
  if (!json) throw new Error('Empty response from Groq');
  json = json.trim();
  try {
    return JSON.parse(json);
  } catch {
    const start = json.indexOf('{');
    const end = json.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const sliced = json.slice(start, end + 1);
      return JSON.parse(sliced);
    }
    throw new Error('Invalid JSON from Groq');
  }
}

export async function generateVisualizationImpl(project) {
  const stabilityKey = process.env.STABILITY_API_KEY;
  if (!project?.base64Image) return { imageUrl: null };
  if (!stabilityKey) throw new Error('STABILITY_API_KEY is missing');

  const base64Data = project.base64Image.includes(',') ? project.base64Image.split(',')[1] : project.base64Image;
  const bufferOriginal = Buffer.from(base64Data, 'base64');

  let buffer;
  try {
    buffer = await sharp(bufferOriginal)
      .resize(1024, 1024, { fit: 'cover' })
      .png()
      .toBuffer();
  } catch {
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
    : `Generate a photorealistic architectural visualization based on the provided site photo. Type: ${project.type}. Scale: ${project.scale}. Style: ${project.style}. Maintain perspective, lighting, and realistic integration with surroundings.`;

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
  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`Stability error: ${resp.status} ${errTxt}`);
  }
  const j = await resp.json();
  const b64 = j?.artifacts?.[0]?.base64;
  return { imageUrl: b64 ? `data:image/png;base64,${b64}` : null };
}

