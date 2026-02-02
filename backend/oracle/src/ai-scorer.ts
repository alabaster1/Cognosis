/**
 * AI Scorer - OpenAI GPT-4 semantic similarity scoring
 */

import OpenAI from 'openai';

export class AIScorer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Score a Remote Viewing attempt (0-100)
   * Uses semantic similarity between user prediction and target description
   */
  async scoreRemoteViewing(
    userPrediction: string,
    targetDescription: string
  ): Promise<number> {
    const prompt = `You are an expert evaluator for Remote Viewing experiments.

Compare the user's Remote Viewing prediction to the actual target description.

User's Prediction:
"${userPrediction}"

Actual Target:
"${targetDescription}"

Evaluate the accuracy on a scale of 0-100 based on:
- Semantic similarity (correct concepts, themes, colors, objects)
- Spatial relationships (correct positions, directions, arrangements)
- Sensory details (textures, sounds, feelings)
- Overall gestalt (capturing the essence of the target)

Scoring guidelines:
- 0-20: Completely incorrect, no meaningful overlap
- 21-40: Some vague similarities, mostly incorrect
- 41-60: Moderate accuracy, some correct elements
- 61-80: Good accuracy, multiple correct elements
- 81-95: Excellent accuracy, most elements correct
- 96-100: Nearly perfect, exceptional accuracy

Respond with ONLY a JSON object in this format:
{
  "score": <number 0-100>,
  "reasoning": "<brief explanation of score>"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an expert Remote Viewing evaluator. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for consistent scoring
        max_tokens: 300,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      // Parse JSON response
      const result = JSON.parse(content);
      const score = Math.min(100, Math.max(0, Math.round(result.score)));

      console.log(`   AI Reasoning: ${result.reasoning}`);
      
      return score;

    } catch (err) {
      console.error('   ❌ AI scoring failed:', err);
      
      // Fallback: simple word overlap scoring
      console.log('   ⚠️  Using fallback scoring method');
      return this.fallbackScoring(userPrediction, targetDescription);
    }
  }

  /**
   * Fallback scoring using simple word overlap
   */
  private fallbackScoring(prediction: string, target: string): number {
    const predWords = new Set(
      prediction.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3) // Ignore short words
    );

    const targetWords = new Set(
      target.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

    // Calculate Jaccard similarity
    const intersection = new Set([...predWords].filter(w => targetWords.has(w)));
    const union = new Set([...predWords, ...targetWords]);

    if (union.size === 0) return 0;

    const similarity = intersection.size / union.size;
    const score = Math.round(similarity * 100);

    console.log(`   Fallback score: ${score}% (${intersection.size} matching words)`);
    
    return score;
  }
}
