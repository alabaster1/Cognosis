const eventRetrievalService = require('../eventRetrievalService');
const aiService = require('../aiService');

/**
 * Agent Orchestrator - Coordinates AI agents for the complete reveal flow
 *
 * FLOW:
 * 1. Information Retrieval Agent - Gathers real-world data
 * 2. Scoring Agent - Evaluates prediction accuracy
 * 3. Returns complete score package for blockchain submission
 */

class AgentOrchestrator {
  constructor() {
    this.name = 'AgentOrchestrator';
  }

  /**
   * Complete AI-enhanced reveal flow
   *
   * @param {Object} params
   * @param {string} params.commitmentId - Experiment commitment ID
   * @param {string} params.experimentType - Type of experiment
   * @param {string} params.prediction - User's original prediction
   * @param {Object} params.metadata - Experiment metadata (targetDate, location, etc.)
   * @param {Function} params.progressCallback - Optional callback for progress updates
   *
   * @returns {Promise<Object>} Complete scoring results with evidence
   */
  async processReveal({ commitmentId, experimentType, prediction, metadata, progressCallback }) {
    try {
      console.log(`[AgentOrchestrator] Starting reveal for ${experimentType} experiment ${commitmentId}`);

      // Emit progress: Starting
      if (progressCallback) {
        progressCallback({ stage: 'starting', progress: 0, message: 'Initializing AI agents...' });
      }

      // STEP 1: Information Retrieval Agent
      let retrievedData = null;
      let retrievalError = null;

      try {
        if (progressCallback) {
          progressCallback({ stage: 'retrieval', progress: 20, message: 'Gathering real-world evidence...' });
        }

        retrievedData = await this.retrieveEvidence({
          experimentType,
          prediction,
          metadata
        });

        console.log(`[AgentOrchestrator] Retrieved ${retrievedData.events?.length || 0} events`);
      } catch (error) {
        console.error('[AgentOrchestrator] Retrieval error:', error);
        retrievalError = error.message;
        // Continue with scoring even if retrieval fails
        retrievedData = { events: [], summary: 'Unable to retrieve events', error: error.message };
      }

      // STEP 2: Scoring Agent
      if (progressCallback) {
        progressCallback({ stage: 'scoring', progress: 60, message: 'Analyzing prediction accuracy...' });
      }

      const scoringResult = await this.scoreWithAI({
        experimentType,
        prediction,
        retrievedData,
        metadata
      });

      console.log(`[AgentOrchestrator] Score: ${scoringResult.score}%`);

      // STEP 3: Package results
      if (progressCallback) {
        progressCallback({ stage: 'finalizing', progress: 90, message: 'Preparing results...' });
      }

      const result = {
        // Core scoring
        score: scoringResult.score,
        explanation: scoringResult.explanation || scoringResult.analysis,

        // Detailed breakdown
        matches: scoringResult.matches || scoringResult.specificHits || [],
        misses: scoringResult.misses || scoringResult.specificMisses || [],

        // Retrieved evidence
        retrievedData: {
          events: retrievedData.events || [],
          summary: retrievedData.summary || '',
          dateRange: retrievedData.dateRange,
          retrievalMethod: retrievedData.retrievalMethod,
          error: retrievalError
        },

        // Metadata
        commitmentId,
        experimentType,
        scoringMethod: scoringResult.scoringMethod,
        timestamp: new Date().toISOString(),

        // Optional detailed scoring (experiment-type specific)
        ...(scoringResult.emotionalMatch && { emotionalMatch: scoringResult.emotionalMatch }),
        ...(scoringResult.conceptualMatch && { conceptualMatch: scoringResult.conceptualMatch }),
        ...(scoringResult.vividness && { vividness: scoringResult.vividness }),
        ...(scoringResult.themes && { themes: scoringResult.themes }),
        ...(scoringResult.accuracy && { accuracy: scoringResult.accuracy }),
      };

      if (progressCallback) {
        progressCallback({ stage: 'complete', progress: 100, message: 'Analysis complete!' });
      }

      return result;
    } catch (error) {
      console.error('[AgentOrchestrator] Process reveal error:', error);
      throw new Error(`AI reveal failed: ${error.message}`);
    }
  }

  /**
   * STEP 1: Information Retrieval Agent
   * Routes to appropriate retrieval strategy based on experiment type
   */
  async retrieveEvidence({ experimentType, prediction, metadata }) {
    const targetDate = metadata.targetDate ? new Date(metadata.targetDate) : new Date();

    // Define retrieval window (target date ± 2 days for most experiments)
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 2);

    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 2);

    // Route based on experiment type
    switch (experimentType) {
      case 'precognition':
        return this.retrievePrecognitionEvents({
          prediction,
          startDate,
          endDate,
          metadata
        });

      case 'remote-viewing':
        return this.retrieveRemoteViewingEvents({
          prediction,
          targetDate,
          metadata
        });

      case 'dream-journal':
        return this.retrieveDreamEvents({
          prediction,
          startDate,
          endDate,
          metadata
        });

      case 'synchronicity':
        return this.retrieveSynchronicityEvents({
          prediction,
          targetDate,
          metadata
        });

      case 'global-consciousness':
        return this.retrieveGlobalEvents({
          prediction,
          startDate,
          endDate,
          metadata
        });

      case 'telepathy':
      case 'multi-party-telepathy':
      case 'psychokinesis':
      case 'retrocausality':
      case 'intuition':
        // These may require manual verification or different approaches
        return {
          events: [],
          summary: `${experimentType} experiments may require manual verification or controlled experiment data.`,
          retrievalMethod: 'manual_verification_required',
          dateRange: `${startDate.toDateString()} to ${endDate.toDateString()}`
        };

      default:
        console.warn(`[AgentOrchestrator] Unknown experiment type: ${experimentType}`);
        return {
          events: [],
          summary: 'Unknown experiment type',
          retrievalMethod: 'none'
        };
    }
  }

  /**
   * Retrieve events for Precognition experiments
   */
  async retrievePrecognitionEvents({ prediction, startDate, endDate, metadata }) {
    // Determine event category from metadata
    const eventType = metadata.eventType || metadata.category || 'news';

    const categories = this.mapEventTypeToCategories(eventType);

    return await eventRetrievalService.queryEvents({
      startDate,
      endDate,
      predictionContext: prediction,
      categories
    });
  }

  /**
   * Retrieve events for Remote Viewing experiments
   */
  async retrieveRemoteViewingEvents({ prediction, targetDate, metadata }) {
    const location = metadata.location || metadata.targetLocation;

    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 1);

    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    // Include location context in retrieval
    const predictionContext = location
      ? `${prediction} (Location: ${location})`
      : prediction;

    return await eventRetrievalService.queryEvents({
      startDate,
      endDate,
      predictionContext,
      categories: ['news', 'weather', 'events']
    });
  }

  /**
   * Retrieve events for Dream Journal (precognitive dreams)
   */
  async retrieveDreamEvents({ prediction, startDate, endDate, metadata }) {
    return await eventRetrievalService.queryEvents({
      startDate,
      endDate,
      predictionContext: `Dream content: ${prediction}`,
      categories: ['news', 'personal', 'events', 'culture']
    });
  }

  /**
   * Retrieve events for Synchronicity tracking
   */
  async retrieveSynchronicityEvents({ prediction, targetDate, metadata }) {
    const startDate = new Date(targetDate);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59);

    return await eventRetrievalService.queryEvents({
      startDate,
      endDate,
      predictionContext: `Synchronicity pattern: ${prediction}`,
      categories: ['news', 'culture', 'trends', 'events']
    });
  }

  /**
   * Retrieve global events for Global Consciousness experiments
   */
  async retrieveGlobalEvents({ prediction, startDate, endDate, metadata }) {
    return await eventRetrievalService.queryEvents({
      startDate,
      endDate,
      predictionContext: prediction,
      categories: ['news', 'world', 'disasters', 'major_events']
    });
  }

  /**
   * STEP 2: Scoring Agent
   * Routes to appropriate AI scoring method based on experiment type
   */
  async scoreWithAI({ experimentType, prediction, retrievedData, metadata }) {
    // Build actual outcome summary from retrieved data
    const actualOutcome = retrievedData.events && retrievedData.events.length > 0
      ? this.buildOutcomeSummary(retrievedData.events, retrievedData.summary)
      : 'No specific events retrieved for comparison.';

    // Route to appropriate scoring method
    switch (experimentType) {
      case 'remote-viewing':
        return await aiService.scoreRemoteViewing(prediction, actualOutcome);

      case 'telepathy':
      case 'multi-party-telepathy':
        return await aiService.scoreTelepathy(prediction, actualOutcome, experimentType);

      case 'dream-journal':
        return await aiService.scoreDreamJournal(prediction);

      case 'precognition':
      case 'retrocausality':
      case 'global-consciousness':
        return await aiService.scoreEventForecast(prediction, actualOutcome);

      case 'synchronicity':
        return await aiService.scoreSynchronicity(prediction);

      case 'psychokinesis':
      case 'intuition':
        // These may have deterministic or manual scoring
        return {
          score: 50,
          analysis: `${experimentType} experiments may require specialized scoring methods.`,
          scoringMethod: 'placeholder'
        };

      default:
        return {
          score: 50,
          analysis: 'Unknown experiment type - default scoring applied.',
          scoringMethod: 'basic'
        };
    }
  }

  /**
   * Helper: Map event type to retrieval categories
   */
  mapEventTypeToCategories(eventType) {
    const categoryMap = {
      'news': ['news', 'world', 'politics'],
      'sports': ['sports'],
      'weather': ['weather'],
      'market': ['markets', 'finance', 'economy'],
      'personal': ['personal', 'local'],
      'other': ['news', 'events']
    };

    return categoryMap[eventType] || ['news'];
  }

  /**
   * Helper: Build outcome summary from retrieved events
   */
  buildOutcomeSummary(events, summary) {
    if (!events || events.length === 0) {
      return summary || 'No specific events found.';
    }

    const eventDescriptions = events
      .slice(0, 5) // Top 5 most relevant
      .map(event => `- ${event.title}: ${event.description}`)
      .join('\n');

    return `${summary}\n\nSpecific events:\n${eventDescriptions}`;
  }
}

module.exports = new AgentOrchestrator();
