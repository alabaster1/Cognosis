#!/usr/bin/env node
/**
 * Cognosis Oracle Backend
 * Watches for RV submissions, scores with AI, distributes rewards
 */

import { config } from './config.js';
import { CardanoClientCLI } from './cardano-client-cli.js';
import { AIScorer } from './ai-scorer.js';
import { RevealTransactionBuilderCLI } from './tx-builder-cli.js';

async function main() {
  console.log('🔮 Cognosis Oracle Starting...');
  console.log(`Network: ${config.network}`);
  console.log(`Experiment Contract: ${config.experimentAddress}`);
  console.log(`Oracle Address: ${config.oracleAddress}`);
  console.log('');

  // Initialize services
  const cardano = new CardanoClientCLI(config);
  const aiScorer = new AIScorer(config.openaiApiKey);
  const txBuilder = new RevealTransactionBuilderCLI(config);

  await cardano.initialize();
  console.log('✅ AI scorer ready');
  console.log('');

  // Poll for new experiments
  console.log('👀 Watching for new RV submissions...');
  
  while (true) {
    try {
      // Query experiment contract for UTxOs
      const experiments = await cardano.getExperimentUTxOs();

      if (experiments.length > 0) {
        console.log(`\n📋 Found ${experiments.length} pending experiment(s)`);

        for (const exp of experiments) {
          try {
            console.log(`\n🔍 Processing experiment: ${exp.txHash}#${exp.outputIndex}`);
            console.log(`   User: ${exp.datum.userPkh}`);
            console.log(`   IPFS: ${exp.datum.ipfsHash}`);
            console.log(`   Target: ${exp.datum.targetDescription}`);

            // Fetch prediction from IPFS (for now, use dummy data)
            // TODO: Implement actual IPFS fetch
            const userPrediction = "I see a red barn near a lake with mountains in the background";
            const targetDescription = exp.datum.targetDescription;

            console.log(`   User prediction: "${userPrediction}"`);

            // Score with AI
            console.log(`\n🤖 Scoring with OpenAI GPT-4...`);
            const score = await aiScorer.scoreRemoteViewing(
              userPrediction,
              targetDescription
            );
            console.log(`   ✅ Accuracy: ${score}%`);

            // Build and submit reveal transaction
            console.log(`\n📝 Building reveal transaction...`);
            const txHash = await txBuilder.buildAndSubmitReveal(exp, score);
            console.log(`   ✅ Reveal submitted: ${txHash}`);
            console.log(`   🎉 PSY reward distributed!`);

          } catch (err) {
            console.error(`   ❌ Error processing experiment:`, err);
          }
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, config.pollIntervalMs));

    } catch (err) {
      console.error('❌ Polling error:', err);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
