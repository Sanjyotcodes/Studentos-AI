import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

try {
  const res = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: 'Reply with exactly the word: OK',
  });
  console.log('SUCCESS:', res.text);
} catch (err) {
  console.log('FAILED:', err?.message ?? err);
}
