
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Load environment variables, Next.js does this automatically for .env.local,
// but for genkit CLI, explicit loading might be needed if not using .env at root.
// However, genkit start itself should load .env files.

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.0-flash', // Default model for ai.generate if not specified
});
