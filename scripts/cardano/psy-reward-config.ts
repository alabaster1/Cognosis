/**
 * PSY Reward System Configuration
 * Updated with exponential accuracy-based rewards and lottery
 */

export const PSY_REWARD_CONFIG = {
  // Token economics
  totalSupply: 10_000_000_000, // 10 billion PSY
  
  allocation: {
    community: 5_000_000_000,  // 50% - rewards, airdrops, incentives
    research: 2_000_000_000,   // 20% - research grants, partnerships
    team: 1_500_000_000,       // 15% - team vesting
    ecosystem: 1_500_000_000,  // 15% - development, liquidity
  },
  
  // Reward parameters (Base 100, Max 400, Steepness 2.5)
  rewards: {
    baseReward: 100,           // PSY for any participation
    maxReward: 400,            // PSY for perfect accuracy
    steepness: 2.5,            // Exponential curve steepness
    
    // Examples by accuracy:
    examples: {
      '20%': 105,  // ~100 PSY
      '50%': 153,  // ~153 PSY
      '75%': 246,  // ~246 PSY
      '90%': 331,  // ~331 PSY
      '95%': 364,  // ~364 PSY
      '100%': 400, // 400 PSY
    },
  },
  
  // Lottery system
  lottery: {
    feePerSubmission: 0.01,    // ADA (10,000 lovelace)
    drawingFrequency: 'hourly (PREPROD TESTING)', // How often to draw
    drawingFrequencyMs: 60 * 60 * 1000, // 1 hour in milliseconds (PREPROD: was 1 week)
    alphaWeight: 0.5,          // Hybrid sqrt/log balance (0-1)
    
    // Ticket weighting (hybrid α=0.5)
    ticketExamples: {
      '25 PSY': 10.7,   // tickets
      '50 PSY': 13.4,   // tickets
      '75 PSY': 15.2,   // tickets
      '100 PSY': 16.5,  // tickets
      '150 PSY': 18.7,  // tickets
      '200 PSY': 20.3,  // tickets
    },
  },
  
  // Fee structure
  fees: {
    experimentEntry: 2.01,     // ADA total
    protocolFee: 2.00,         // ADA (operational costs)
    lotteryFee: 0.01,          // ADA (goes to jackpot)
  },
  
  // Sustainability projections
  sustainability: {
    // At 100 submissions/week
    low: {
      submissionsPerWeek: 100,
      avgRewardPsy: 205,       // Average across accuracy distribution
      weeklyPsyCost: 20_500,
      yearsRunway: 4684,       // With 5B PSY allocation
    },
    
    // At 500 submissions/week (growth phase)
    medium: {
      submissionsPerWeek: 500,
      avgRewardPsy: 205,
      weeklyPsyCost: 102_500,
      yearsRunway: 937,
    },
    
    // At 5,000 submissions/week (viral)
    high: {
      submissionsPerWeek: 5000,
      avgRewardPsy: 205,
      weeklyPsyCost: 1_025_000,
      yearsRunway: 94,
    },
  },
  
  // Aiken validator parameters (scaled for on-chain)
  aikenParams: {
    baseReward: 100,           // PSY (no scaling needed)
    maxReward: 400,            // PSY
    rewardSteepness: 250,      // Steepness * 100 (2.5 → 250)
    lotteryFeeLovelace: 10_000, // 0.01 ADA in lovelace
    alphaWeightScaled: 50,     // Alpha * 100 (0.5 → 50)
  },
  
  // Validator hashes (from aiken build)
  validators: {
    rewardVaultV2: 'a95df2440082887e93aea18768af16bb5c784f71d33dba21a4183a7b',
    psyLottery: '30d6ef5fc1e228d6aa9f36ba7b8c16ac80270255142640f6f5176c0a',
    psiExperiment: '', // TODO: Get from existing experiment deployment
  },
};

/**
 * Calculate reward for a given accuracy score
 */
export function calculateReward(accuracy: number): number {
  const { baseReward, maxReward, steepness } = PSY_REWARD_CONFIG.rewards;
  
  // Ensure accuracy is in valid range
  if (accuracy < 0) accuracy = 0;
  if (accuracy > 100) accuracy = 100;
  
  // Normalize to 0-1
  const normAccuracy = accuracy / 100;
  
  // Apply exponential curve
  const bonusMultiplier = Math.pow(normAccuracy, steepness);
  
  // Calculate reward
  const bonusPool = maxReward - baseReward;
  const reward = baseReward + bonusPool * bonusMultiplier;
  
  return Math.floor(reward);
}

/**
 * Calculate lottery tickets for PSY amount
 */
export function calculateLotteryTickets(psyEarned: number): number {
  const { alphaWeight } = PSY_REWARD_CONFIG.lottery;
  
  if (psyEarned <= 0) return 0;
  
  // Hybrid sqrt/log formula
  const sqrtWeight = Math.sqrt(psyEarned);
  const logWeight = Math.log(psyEarned + 1) * 5; // Scale log
  
  const tickets = alphaWeight * sqrtWeight + (1 - alphaWeight) * logWeight;
  
  return tickets;
}

/**
 * Estimate weekly lottery jackpot
 */
export function estimateWeeklyJackpot(submissionsPerWeek: number): number {
  const feePerSubmission = PSY_REWARD_CONFIG.lottery.feePerSubmission;
  return submissionsPerWeek * feePerSubmission;
}

// Export for TypeScript modules
export default PSY_REWARD_CONFIG;
