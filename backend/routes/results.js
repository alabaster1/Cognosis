const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');
const ipfsService = require('../services/ipfsService');
const blockchainService = require('../services/blockchainService');
const targetService = require('../services/targetService');
const aiService = require('../services/aiService');

// Submit response
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { experimentId, response, responseType } = req.body;

    if (!experimentId || !response) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify experiment exists and hasn't been responded to
    const experiment = await blockchainService.getExperiment(experimentId);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    if (experiment.responseHash) {
      return res.status(400).json({ error: 'Response already submitted' });
    }

    // Encrypt and upload response to IPFS
    const encryptedResponse = await ipfsService.encryptAndUpload({
      experimentId,
      walletAddress: req.user.walletAddress,
      response,
      responseType: responseType || 'text',
      timestamp: new Date().toISOString()
    });

    // Store response hash on blockchain
    const result = await blockchainService.submitResponse(
      experimentId,
      encryptedResponse.hash,
      encryptedResponse.ipfsHash
    );

    res.json({
      success: true,
      experimentId,
      responseHash: encryptedResponse.hash,
      ipfsHash: encryptedResponse.ipfsHash,
      transactionHash: result.txHash
    });
  } catch (error) {
    console.error('Submit response error:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

// Reveal target and score
router.post('/reveal', authMiddleware, async (req, res) => {
  try {
    const { experimentId } = req.body;

    if (!experimentId) {
      return res.status(400).json({ error: 'Missing experimentId' });
    }

    // Get experiment from blockchain
    const experiment = await blockchainService.getExperiment(experimentId);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    if (!experiment.responseHash) {
      return res.status(400).json({ error: 'No response submitted yet' });
    }

    if (experiment.revealed) {
      return res.status(400).json({ error: 'Target already revealed' });
    }

    // Get target from service
    const target = await targetService.getTarget(experiment.targetHash);

    // Get user response from IPFS
    const userResponse = await ipfsService.decryptAndDownload(experiment.responseIpfsHash);

    // Determine experiment type and call appropriate AI scoring function
    let scoringResult;
    const experimentType = experiment.experimentType || 'remote-viewing';

    try {
      switch (experimentType) {
        case 'rv-images':
        case 'rv-locations':
        case 'rv-objects':
        case 'remote-viewing':
          scoringResult = await aiService.scoreRemoteViewing(
            userResponse.response,
            target.data
          );
          break;

        case 'tele-images':
        case 'tele-emotions':
        case 'tele-ai':
        case 'telepathy':
          scoringResult = await aiService.scoreTelepathy(
            userResponse.response,
            target.data,
            experimentType
          );
          break;

        case 'dream-journal':
        case 'dream-precog':
        case 'dream-telepathy':
        case 'lucid-testing':
          scoringResult = await aiService.scoreDreamJournal(
            userResponse.response
          );
          break;

        case 'premon-cards':
          scoringResult = aiService.scoreCardPrediction(
            userResponse.responseData,
            target.card
          );
          break;

        case 'rng-focus':
        case 'pk-rng':
        case 'pk-dice':
        case 'dice-influence':
        case 'quantum-choice':
        case 'probability-shift':
        case 'retro-choice':
        case 'field-coherence':
          scoringResult = aiService.scoreRNGExperiment(
            userResponse.responseData.trials || [],
            userResponse.responseData.intention
          );
          break;

        case 'ganzfeld-images':
        case 'ganzfeld-video':
        case 'ganzfeld-standard':
        case 'mini-ganzfeld':
          scoringResult = await aiService.scoreGanzfeld(
            userResponse.response,
            target.data
          );
          break;

        case 'sync-tracker':
          scoringResult = await aiService.scoreSynchronicity(
            userResponse.response
          );
          break;

        case 'premon-events':
        case 'time-loop':
          // Event forecasting requires actual outcome - score later when revealing
          scoringResult = { score: 0, analysis: 'Event forecast committed - verify after event occurs' };
          break;

        case 'memory-echo':
        case 'delayed-recall':
        case 'resonance-test':
          scoringResult = await aiService.scoreRemoteViewing(
            userResponse.response,
            target.data
          );
          break;

        default:
          scoringResult = await aiService.scoreRemoteViewing(
            userResponse.response,
            target.data
          );
      }
    } catch (error) {
      console.error('AI scoring error:', error);
      scoringResult = {
        score: 0,
        analysis: 'Scoring failed',
        scoringMethod: 'error'
      };
    }

    const score = scoringResult.score / 100; // Convert 0-100 to 0-1 for blockchain storage

    // Store reveal and score on blockchain
    const result = await blockchainService.revealAndScore(
      experimentId,
      target.hash,
      score
    );

    res.json({
      success: true,
      experimentId,
      target: target.data,
      targetType: target.type,
      userResponse: userResponse.response,
      score,
      scoringDetails: scoringResult,
      transactionHash: result.txHash
    });
  } catch (error) {
    console.error('Reveal error:', error);
    res.status(500).json({ error: 'Failed to reveal target' });
  }
});

// Get result details
router.get('/:experimentId', authMiddleware, async (req, res) => {
  try {
    const { experimentId } = req.params;

    const experiment = await blockchainService.getExperiment(experimentId);

    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    if (!experiment.revealed) {
      return res.status(400).json({ error: 'Target not revealed yet' });
    }

    const target = await targetService.getTarget(experiment.targetHash);
    const userResponse = await ipfsService.decryptAndDownload(experiment.responseIpfsHash);

    res.json({
      success: true,
      experimentId,
      target: target.data,
      targetType: target.type,
      userResponse: userResponse.response,
      score: experiment.score,
      timestamp: experiment.timestamp
    });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ error: 'Failed to get result' });
  }
});

module.exports = router;
