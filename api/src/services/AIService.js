import Groq from 'groq-sdk';
import { extractJsonObject } from '../utils/extractJson.js';

// The model writes in English unless told otherwise.
const GENERATED_LANGUAGE_NAMES = { es: 'Spanish', fr: 'French', it: 'Italian', de: 'German' };

// Keep in sync with shared/src/utils/constants/constants.js#aiPaceOptions (api/ has no
// dependency on shared/, so this mapping is duplicated by necessity, not oversight).
const PLACES_PER_DAY_BY_PACE = {
  relaxed: 2,
  normal: 3,
  intense: 4,
};
const DEFAULT_PACE = 'normal';
// Budget max_tokens to the actual number of places requested instead of a flat cap:
// a long trip on an intense pace can ask for well over what a fixed 4000-token budget
// covers, silently truncating the JSON mid-object and failing with a confusing
// "AI returned invalid JSON" error that gives no hint it was a length problem.
const TOKENS_PER_PLACE = 150;
const BASE_PROMPT_OVERHEAD_TOKENS = 300;
const MAX_TOKENS_CEILING = 8000;

export class AIService {
  constructor() {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async generateTextPrompt(destination, totalDays, context = {}) {
    const { category, numberOfTravellers, budget, currency, intention, language, pace } = context;
    const placesPerDay = PLACES_PER_DAY_BY_PACE[pace] ?? PLACES_PER_DAY_BY_PACE[DEFAULT_PACE];
    // Cap the place count itself (not just max_tokens) on very long trips, so the
    // prompt's own "generate exactly N places" instruction never asks for more than the
    // token budget can hold; that mismatch is what silently truncates the JSON response.
    const maxPlaceCountForCeiling = Math.floor((MAX_TOKENS_CEILING - BASE_PROMPT_OVERHEAD_TOKENS) / TOKENS_PER_PLACE);
    const placeCount = Math.min(totalDays * placesPerDay, maxPlaceCountForCeiling);
    const maxTokens = BASE_PROMPT_OVERHEAD_TOKENS + placeCount * TOKENS_PER_PLACE;
    const placesPerDayForPrompt = totalDays > 0 ? Math.max(1, Math.round(placeCount / totalDays)) : placesPerDay;

    const contextLines = [
      category && category !== 'other' ? `- Trip style: ${category}` : null,
      numberOfTravellers ? `- Travelers: ${numberOfTravellers}` : null,
      budget && currency ? `- Budget: ${budget} ${currency} total` : null,
    ].filter(Boolean).join('\n');

    const intentionBlock = intention?.trim() ? `
TRAVELER'S SPECIFIC WISHES: THIS IS YOUR PRIMARY DIRECTIVE:
"${intention.trim()}"

You MUST:
1. If the traveler mentioned specific places, landmarks, or activities, include them EXACTLY (e.g. "Santa Claus Village" → include it; "snowmobile" → include a snowmobile activity; "fly to Helsinki" → include a flight/airport step).
2. Build the remaining places around those specific requests.
3. Never substitute or ignore what the traveler explicitly asked for.
` : '';

    const languageName = GENERATED_LANGUAGE_NAMES[language];
    const languageInstruction = languageName
      ? `\nGenerate ALL text fields (title, description, label) in ${languageName}.`
      : '';

    const systemPrompt = `You are an expert travel planner creating highly personalized itineraries.
Your most important job is to read the traveler's specific wishes and satisfy them directly.
Output ONLY valid raw JSON. No markdown, no explanation, no extra text.`;

    const userPrompt = `Create a ${totalDays}-day itinerary for ${destination}.
${intentionBlock}
${contextLines ? `Trip context:\n${contextLines}` : ''}
${languageInstruction}

Generate exactly ${placeCount} places total: ${placesPerDayForPrompt} per day, days 1 to ${totalDays}.

Each place must be a JSON object with:
- title: name of the place or activity (string)
- description: 1-2 engaging sentences (string)
- label: very short label, max 3 words (string)
- latitude: real decimal coordinate (number)
- longitude: real decimal coordinate (number)
- category: exactly one of [nature, beach, city, park, monument, camping, island, sport, vineyard, other]
- dayNumber: which day, 1 to ${totalDays} (number)

Output ONLY this JSON structure:
{
  "destination": "${destination}",
  "totalDays": ${totalDays},
  "places": [ ... ]
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
        reasoning_effort: 'low',
      });

      const text = response.choices[0]?.message?.content;
      const json = extractJsonObject(text);
      if (!json) throw new Error('No valid JSON found in response');
      return json;
    } catch (error) {
      // error propagates to errorHandler, no need to log here
      throw error;
    }
  }
}
