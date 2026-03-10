import { CohereClient } from 'cohere-ai';

export class AIService {
  constructor() {
    this.client = new CohereClient({
      token: process.env.COHERE_API_KEY
    })
  }

  async generateTextPrompt(destination, totalDays) {
    const prompt = `Create a JSON itinerary for a ${totalDays}-day trip to ${destination}. 
      Include exactly 3 places per day (so ${totalDays * 3} total).

      Each place must have these fields:
      - title (string)
      - address (string)
      - description (string)
      - label (string)
      - latitude (string)
      - longitude (string)
      - category (one single value from this list: nature, beach, city, park, monument, camping, island, sport, vineyard, other)

      Output ONLY a valid JSON like this:

      {
        "destination": "${destination}",
        "totalDays": ${totalDays},
        "latitude": "${destination} latitude",
        "longitude": "${destination} longitude",
        "places": [
          {
            "title": "Example Title",
            "address": "Example Street, City",
            "description": "Short engaging text.",
            "label": "Short label",
            "latitude": "41.4036",
            "longitude": "2.1744",
            "category": "city"
          }
        ]
      }

      Do not use multiple categories. Use only one valid category per place. 
      Do not return any text, explanation, or formatting, just raw JSON.
      `;

    try {
      const response = await this.client.generate({
        model: 'command-r-plus', // o command-light if plan free//o command-r-plus pay plan(xlarge?xmedium?)
        prompt,
        maxTokens: 1300,
        temperature: 0.8, //random grade for answers
        k: 0,
        p: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: [],
        returnLikelihoods: 'NONE'
      })


      const text = response.generations?.[0]?.text
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response text')
      }
      return jsonMatch[0];
    } catch (error) {
      console.error('Error generating itinerary text:', error)
      throw error
    }
  }
}
