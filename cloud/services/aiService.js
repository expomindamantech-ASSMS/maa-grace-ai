// cloud/services/aiService.js
const https = require('https');

const GEMINI_BASE = 'generativelanguage.googleapis.com';
const TEXT_MODEL  = 'gemini-2.0-flash';
const IMAGE_MODEL = 'gemini-2.0-flash-exp-image-generation';

const SYSTEM_PROMPT = `You are Maa Grace AI, a warm, intelligent, and culturally-aware AI assistant built by AmanTech for Ghana and West Africa. You are helpful, honest, creative, and deeply familiar with Ghanaian culture, education, and context. Always be respectful, clear, and practical. When discussing education topics, align with Ghana's NaCCA CBC curriculum and GES standards.`;

function geminiRequest(path, body) {
  return new Promise((resolve, reject) => {
    const key = process.env.GEMINI_API_KEY;
    const data = JSON.stringify(body);
    const options = {
      hostname: GEMINI_BASE,
      path: `/v1beta/models/${path}?key=${key}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error('Invalid JSON from Gemini')); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function generateText(prompt, images, history) {
  const parts = [];
  if (Array.isArray(images)) {
    images.forEach(img => {
      const b64 = img.includes(',') ? img.split(',')[1] : img;
      let mime = 'image/jpeg';
      if (img.startsWith('data:image/png')) mime = 'image/png';
      else if (img.startsWith('data:image/webp')) mime = 'image/webp';
      parts.push({ inline_data: { mime_type: mime, data: b64 } });
    });
  }
  parts.push({ text: prompt });

  const contents = [];
  if (Array.isArray(history)) {
    history.forEach(m => {
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
    });
  }
  contents.push({ role: 'user', parts });

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { maxOutputTokens: 8192, temperature: 0.8, topP: 0.95 }
  };

  const resp = await geminiRequest(`${TEXT_MODEL}:generateContent`, body);
  if (resp.error) throw new Error(resp.error.message || 'Gemini error');
  const text = resp?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return text;
}

async function generateImage(prompt) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
  };
  const resp = await geminiRequest(`${IMAGE_MODEL}:generateContent`, body);
  if (resp.error) throw new Error(resp.error.message || 'Image generation failed');
  const parts = resp?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inline_data) return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
  }
  throw new Error('No image generated');
}

async function transcribeAudio(audioBase64, mimeType) {
  const b64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType || 'audio/webm', data: b64 } },
        { text: 'Transcribe this audio accurately. Return only the transcription text, nothing else.' }
      ]
    }]
  };
  const resp = await geminiRequest(`${TEXT_MODEL}:generateContent`, body);
  if (resp.error) throw new Error(resp.error.message || 'Transcription failed');
  const text = resp?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No transcription result');
  return text.trim();
}

async function generateTitle(prompt) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: `Generate a short, concise chat title (max 6 words, no quotes) for this message: "${prompt.substring(0, 200)}"` }] }],
    generationConfig: { maxOutputTokens: 30, temperature: 0.5 }
  };
  const resp = await geminiRequest(`${TEXT_MODEL}:generateContent`, body);
  const text = resp?.candidates?.[0]?.content?.parts?.[0]?.text || 'New Chat';
  return text.trim().replace(/^"|"$/g, '').substring(0, 60);
}

module.exports = { generateText, generateImage, transcribeAudio, generateTitle };
