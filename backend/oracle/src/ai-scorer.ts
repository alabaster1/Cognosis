/**
 * AI Scorer - OpenAI GPT-4 for Remote Viewing accuracy
 */

import OpenAI from 'openai';

export class AIScorer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Score Remote Viewing prediction using semantic similarity
   */
  async scoreRemoteViewing(
    userPrediction: string,
    targetDescription: string
  ): Promise<number> {
    try {
      const prompt = `You are scoring a Remote Viewing prediction. Compare the user's prediction to the actual target and give an accuracy score from 0-100.

**Target (actual):** ${targetDescription}

**User's prediction:** ${userPrediction}

Consider:
- Visual elements (colors, shapes, structures)
- Environmental context (water, land, urban, natural)
- Emotional/sensory impressions
- Overall accuracy

Return ONLY a JSON object with your scoring:
{
  "accuracy": <0-100 integer>,
  "reasoning": "<1-2 sentence explanation>"
}

Do not wrap in markdown code blocks. Just return the JSON.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      
      // Strip markdown code blocks if present
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```')) {
        // Remove ```json or ``` prefix and ``` suffix
        cleanedResponse = cleanedResponse
          .replace(/^```(?:json)?\n?/, '')
          .replace(/\n?```$/, '')
          .trim();
      }

      const result = JSON.parse(cleanedResponse);
      
      // Validate result
      if (typeof result.accuracy !== 'number' || result.accuracy < 0 || result.accuracy > 100) {
        throw new Error('Invalid accuracy score');
      }

      console.log(`   Reasoning: ${result.reasoning}`);
      
      return Math.round(result.accuracy);

    } catch (error: any) {
      console.error(`   ❌ AI scoring failed: ${error.message}`);
      console.log(`   ⚠️  Using fallback scoring method`);
      
      // Fallback: Simple word matching
      const userWords = new Set(userPrediction.toLowerCase().split(/\s+/));
      const targetWords = new Set(targetDescription.toLowerCase().split(/\s+/));
      
      let matches = 0;
      for (const word of userWords) {
        if (targetWords.has(word) && word.length > 3) {
          matches++;
        }
      }
      
      const fallbackScore = Math.min(100, matches * 20); // 20% per significant word match
      console.log(`   Fallback score: ${fallbackScore}% (${matches} matching words)`);
      
      return fallbackScore;
    }
  }
}
