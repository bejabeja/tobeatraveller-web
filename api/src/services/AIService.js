import Groq from 'groq-sdk';

export class AIService {
  constructor() {
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async generateTextPrompt(destination, totalDays, context = {}) {
    const { category, numberOfTravellers, budget, currency } = context;

    const contextLines = [
      category && category !== 'other' ? `- Trip style: ${category}` : null,
      numberOfTravellers ? `- Number of travellers: ${numberOfTravellers}` : null,
      budget && currency ? `- Budget: ${budget} ${currency} total` : null,
    ].filter(Boolean).join('\n');

    const prompt = `Create a JSON travel itinerary for a ${totalDays}-day trip to ${destination}.
Include exactly 3 places per day (${totalDays * 3} total), spread evenly across all ${totalDays} days.
${contextLines ? `\nTrip context:\n${contextLines}\nTailor the place suggestions to this context.\n` : ''}
Each place must have:
- title (string): name of the place
- description (string): 1-2 engaging sentences about it
- label (string): very short label, max 3 words
- latitude (number): real decimal latitude
- longitude (number): real decimal longitude
- category (exactly one from: nature, beach, city, park, monument, camping, island, sport, vineyard, other)
- dayNumber (number): which day (1 to ${totalDays})

Output ONLY raw valid JSON, no markdown, no explanation:

{
  "destination": "${destination}",
  "totalDays": ${totalDays},
  "places": [
    {
      "title": "Place Name",
      "description": "Short engaging description.",
      "label": "Short label",
      "latitude": 41.4036,
      "longitude": 2.1744,
      "category": "monument",
      "dayNumber": 1
    }
  ]
}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const text = response.choices[0]?.message?.content;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No valid JSON found in response');
      return jsonMatch[0];
    } catch (error) {
      console.error('Error generating itinerary:', error);
      throw error;
    }
  }
}
