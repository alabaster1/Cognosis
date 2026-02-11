/**
 * Fact Verification Layer Module
 * Ensures all scientific claims are properly sourced and statistically valid
 */

const config = require('../config');
const llmHelper = require('../utils/llmHelper');
const { getVectorStore } = require('../utils/vectorStore');

class FactVerificationLayer {
  constructor() {
    this.vectorStore = getVectorStore();
    this.statisticalRequirements = config.agents.scientificCommunicator.statisticalRequirements;
  }

  /**
   * Verify a scientific claim
   * @param {string} claim - The claim to verify
   * @returns {Object} - Verification result with confidence and sources
   */
  async verifyClaim(claim) {
    console.log(`[FactVerifier] Verifying claim: "${claim.substring(0, 100)}..."`);

    // Step 1: Check for statistical claims
    const statsCheck = this.extractStatistics(claim);

    // Step 2: Search knowledge base for supporting evidence
    const similarDocs = await this.vectorStore.search(claim, 5);

    // Step 3: Use AI to assess claim validity
    const aiVerification = await this.verifyWithAI(claim, statsCheck, similarDocs);

    // Step 4: Apply strict requirements
    const finalVerification = this.applyRequirements(aiVerification, statsCheck);

    return finalVerification;
  }

  /**
   * Extract statistical claims from text
   */
  extractStatistics(text) {
    const stats = {
      hasPValue: false,
      pValue: null,
      hasSampleSize: false,
      sampleSize: null,
      hasEffectSize: false,
      effectSize: null,
      hasConfidenceInterval: false,
      confidenceInterval: null,
    };

    // P-value patterns
    const pValueRegex = /p\s*[<>=]\s*(0\.\d+)/gi;
    const pValueMatch = text.match(pValueRegex);
    if (pValueMatch) {
      stats.hasPValue = true;
      const numMatch = pValueMatch[0].match(/0\.\d+/);
      stats.pValue = numMatch ? parseFloat(numMatch[0]) : null;
    }

    // Sample size patterns
    const sampleSizeRegex = /n\s*=\s*(\d+)|sample\s+size[:\s]+(\d+)|(\d+)\s+participants/gi;
    const sampleMatch = text.match(sampleSizeRegex);
    if (sampleMatch) {
      stats.hasSampleSize = true;
      const numMatch = sampleMatch[0].match(/\d+/);
      stats.sampleSize = numMatch ? parseInt(numMatch[0]) : null;
    }

    // Effect size patterns (Cohen's d, r, eta-squared)
    const effectSizeRegex = /(cohen'?s?\s+d|effect\s+size|r)\s*[=:]\s*([-]?\d+\.?\d*)/gi;
    const effectMatch = text.match(effectSizeRegex);
    if (effectMatch) {
      stats.hasEffectSize = true;
      const numMatch = effectMatch[0].match(/([-]?\d+\.?\d*)/);
      stats.effectSize = numMatch ? parseFloat(numMatch[1]) : null;
    }

    // Confidence interval
    const ciRegex = /(\d+)%\s+confidence\s+interval|CI\s*[=:]\s*\[([^\]]+)\]/gi;
    const ciMatch = text.match(ciRegex);
    if (ciMatch) {
      stats.hasConfidenceInterval = true;
      stats.confidenceInterval = ciMatch[0];
    }

    return stats;
  }

  /**
   * Use AI to verify claim with context
   */
  async verifyWithAI(claim, statsCheck, similarDocs) {
    try {
      if (!llmHelper.isAvailable()) {
        // If AI not available, return conservative result
        return {
          verified: false,
          confidence: 0.0,
          category: 'ai_unavailable',
          concerns: ['AI verification unavailable - requires manual review'],
          recommendation: 'reject',
        };
      }

      const context = similarDocs.map(doc =>
        `- ${doc.text} (source: ${doc.id}, confidence: ${doc.score.toFixed(2)})`
      ).join('\n');

      const systemPrompt = `You are a scientific fact checker with STRICT standards. Evaluate claims based on:

CRITICAL RULES:
1. Claims about experimental results MUST have p-values and effect sizes
2. Sample size must be stated and adequate (n >= 30 minimum)
3. Distinguish correlation from causation
4. Flag speculative statements that aren't marked as hypotheses
5. Require citations for all non-trivial claims
6. Be HARSH on vague or unsupported claims

Respond with JSON:
{
  "verified": true/false,
  "confidence": 0.0-1.0,
  "category": "experimental|theoretical|observational|speculative",
  "concerns": ["concern 1", "concern 2"],
  "requiredCitations": ["what needs citation"],
  "statisticalIssues": ["statistical problem 1"],
  "recommendation": "approve|revise|reject",
  "suggestedRevision": "improved version of claim"
}`;

      const userPrompt = `Claim: ${claim}

Statistical Elements Found:
${JSON.stringify(statsCheck, null, 2)}

Knowledge Base Context:
${context || 'No matching context found'}

Verify this claim with scientific rigor.`;

      const response = await llmHelper.chatCompletion({
        systemPrompt,
        userPrompt,
        temperature: 0.2,
        maxTokens: 1000,
      });

      const result = llmHelper.parseJsonResponse(response);

      return {
        ...result,
        similarDocs,
        statsCheck,
        method: 'ai',
      };
    } catch (error) {
      console.error('[FactVerifier] AI verification error:', error.message);

      return {
        verified: false,
        confidence: 0.0,
        category: 'error',
        concerns: ['AI verification failed - requires manual review'],
        recommendation: 'reject',
        error: error.message,
      };
    }
  }

  /**
   * Apply strict requirements from architecture
   */
  applyRequirements(aiVerification, statsCheck) {
    const concerns = [...aiVerification.concerns];
    let confidence = aiVerification.confidence;
    let recommendation = aiVerification.recommendation;

    // Rule: Never claim experimental proof without p-values and effect sizes
    if (aiVerification.category === 'experimental') {
      if (!statsCheck.hasPValue) {
        concerns.push('Experimental claim missing p-value');
        confidence = Math.min(confidence, 0.3);
        recommendation = 'reject';
      }

      if (!statsCheck.hasEffectSize) {
        concerns.push('Experimental claim missing effect size');
        confidence = Math.min(confidence, 0.4);
      }

      if (statsCheck.hasSampleSize && statsCheck.sampleSize < this.statisticalRequirements.minimumSampleSize) {
        concerns.push(`Sample size (${statsCheck.sampleSize}) below minimum (${this.statisticalRequirements.minimumSampleSize})`);
        confidence = Math.min(confidence, 0.5);
      }

      if (statsCheck.hasPValue && statsCheck.pValue >= this.statisticalRequirements.significanceThreshold) {
        concerns.push(`P-value (${statsCheck.pValue}) not statistically significant`);
        confidence = Math.min(confidence, 0.6);
      }
    }

    // Rule: Flag if confidence < 0.7
    if (confidence < 0.7) {
      concerns.push('Confidence below threshold - requires human review');
      recommendation = 'revise';
    }

    return {
      verified: confidence >= 0.7,
      confidence,
      category: aiVerification.category,
      concerns,
      requiredCitations: aiVerification.requiredCitations || [],
      statisticalIssues: aiVerification.statisticalIssues || [],
      recommendation,
      suggestedRevision: aiVerification.suggestedRevision,
      statsCheck,
      similarDocs: aiVerification.similarDocs,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if a research paper is from a predatory journal
   */
  async checkPredatoryJournal(journalName, doi) {
    // Predatory journal indicators
    const predatoryIndicators = [
      'waiver', 'mdpi without peer review', 'frontiers without review',
      'omics publishing', 'bentham science spam',
    ];

    const journalLower = journalName.toLowerCase();
    const isPredatory = predatoryIndicators.some(indicator =>
      journalLower.includes(indicator)
    );

    if (isPredatory) {
      return {
        predatory: true,
        reason: 'Journal flagged as potentially predatory',
        confidence: 0.8,
      };
    }

    // TODO: Integrate with Beall's List or Cabells Predatory Reports API
    return {
      predatory: false,
      reason: 'Journal not flagged',
      confidence: 0.6,
    };
  }

  /**
   * Verify a DOI citation
   */
  async verifyDOI(doi) {
    try {
      const axios = require('axios');

      // Check if DOI is valid via Crossref API
      const response = await axios.get(`https://api.crossref.org/works/${doi}`, {
        timeout: 5000,
      });

      if (response.status === 200) {
        const data = response.data.message;
        return {
          valid: true,
          title: data.title?.[0],
          authors: data.author?.map(a => `${a.given} ${a.family}`).join(', '),
          journal: data['container-title']?.[0],
          year: data.published?.['date-parts']?.[0]?.[0],
          url: `https://doi.org/${doi}`,
        };
      }
    } catch (error) {
      console.error(`[FactVerifier] DOI verification failed for ${doi}:`, error.message);
    }

    return {
      valid: false,
      error: 'DOI not found or invalid',
    };
  }

  /**
   * Distinguish correlation from causation
   */
  checkCorrelationCausation(text) {
    const textLower = text.toLowerCase();

    const causationWords = ['causes', 'results in', 'leads to', 'produces', 'makes'];
    const correlationWords = ['associated with', 'correlated with', 'related to', 'linked to'];

    const hasCausationClaim = causationWords.some(word => textLower.includes(word));
    const hasCorrelationLanguage = correlationWords.some(word => textLower.includes(word));

    if (hasCausationClaim && !this.hasExperimentalEvidence(text)) {
      return {
        issue: true,
        reason: 'Causal language used without experimental evidence',
        suggestion: 'Use "associated with" or "correlated with" instead of causal language',
      };
    }

    return {
      issue: false,
      appropriateLanguage: hasCorrelationLanguage || hasCausationClaim,
    };
  }

  /**
   * Check if text has experimental evidence keywords
   */
  hasExperimentalEvidence(text) {
    const experimentalKeywords = [
      'randomized controlled trial', 'rct', 'experimental study',
      'controlled experiment', 'random assignment', 'intervention study',
    ];

    return experimentalKeywords.some(keyword =>
      text.toLowerCase().includes(keyword)
    );
  }

  /**
   * Batch verify multiple claims
   */
  async verifyClaims(claims) {
    const results = [];

    for (const claim of claims) {
      const result = await this.verifyClaim(claim);
      results.push({
        claim,
        ...result,
      });
    }

    return results;
  }

  /**
   * Get verification statistics
   */
  getStats() {
    // TODO: Implement statistics tracking
    return {
      totalVerified: 0,
      approved: 0,
      rejected: 0,
      revised: 0,
      averageConfidence: 0,
    };
  }
}

module.exports = FactVerificationLayer;
