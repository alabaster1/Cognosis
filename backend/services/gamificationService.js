/**
 * Gamification Service
 * Handles streaks, achievements, performance tracking, and Bayesian updating
 */

class GamificationService {
  /**
   * Update user streak after activity
   */
  async updateStreak(prisma, userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = await prisma.userStreak.findUnique({
      where: { userId }
    });

    if (!streak) {
      // Create new streak
      streak = await prisma.userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActivityDate: today,
          streakStartDate: today,
          totalDaysActive: 1
        }
      });
      return streak;
    }

    const lastActivity = new Date(streak.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);
    const daysSince = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));

    if (daysSince === 0) {
      // Same day, no update needed
      return streak;
    } else if (daysSince === 1) {
      // Consecutive day - increment streak
      const newStreak = streak.currentStreak + 1;
      streak = await prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, streak.longestStreak),
          lastActivityDate: today,
          totalDaysActive: streak.totalDaysActive + 1
        }
      });
    } else {
      // Streak broken - reset
      streak = await prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          lastActivityDate: today,
          streakStartDate: today,
          totalDaysActive: streak.totalDaysActive + 1
        }
      });
    }

    // Check for streak achievements
    await this.checkStreakAchievements(prisma, userId, streak.currentStreak);

    return streak;
  }

  /**
   * Check and unlock streak-based achievements
   */
  async checkStreakAchievements(prisma, userId, currentStreak) {
    const streakMilestones = [
      { days: 3, key: 'streak_3', name: '3-Day Streak', tier: 'bronze', points: 10 },
      { days: 7, key: 'streak_7', name: '1-Week Streak', tier: 'silver', points: 25 },
      { days: 30, key: 'streak_30', name: '1-Month Streak', tier: 'gold', points: 100 },
      { days: 100, key: 'streak_100', name: '100-Day Streak', tier: 'platinum', points: 500 }
    ];

    for (const milestone of streakMilestones) {
      if (currentStreak >= milestone.days) {
        await this.unlockAchievement(prisma, userId, milestone.key, {
          name: milestone.name,
          description: `Complete ${milestone.days} consecutive days of experiments`,
          category: 'streak',
          tier: milestone.tier,
          points: milestone.points,
          requirement: { streakDays: milestone.days }
        });
      }
    }
  }

  /**
   * Unlock an achievement for a user
   */
  async unlockAchievement(prisma, userId, achievementKey, achievementData) {
    // Find or create achievement
    let achievement = await prisma.achievement.findUnique({
      where: { key: achievementKey }
    });

    if (!achievement) {
      achievement = await prisma.achievement.create({
        data: {
          key: achievementKey,
          name: achievementData.name,
          description: achievementData.description,
          category: achievementData.category,
          tier: achievementData.tier,
          points: achievementData.points,
          requirement: achievementData.requirement
        }
      });
    }

    // Check if user already has it
    const existing = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id
        }
      }
    });

    if (!existing) {
      // Grant achievement
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id
        }
      });

      // Increment total unlocked count
      await prisma.achievement.update({
        where: { id: achievement.id },
        data: {
          totalUnlocked: { increment: 1 }
        }
      });

      console.log(`[Gamification] User ${userId} unlocked achievement: ${achievementKey}`);
      return { unlocked: true, achievement };
    }

    return { unlocked: false };
  }

  /**
   * Record performance data for time-series tracking
   */
  async recordPerformance(prisma, userId, experimentType, score, metadata = {}) {
    const baselineScore = 50; // Chance baseline
    const delta = score - baselineScore;

    const performance = await prisma.performanceHistory.create({
      data: {
        userId,
        experimentType,
        score,
        accuracy: metadata.accuracy || null,
        baselineScore,
        delta,
        pValue: metadata.pValue || null,
        zScore: metadata.zScore || null,
        experimentId: metadata.experimentId || null,
        metadata
      }
    });

    // Update Bayesian prior
    await this.updateBayesianPrior(prisma, userId, experimentType, score);

    // Check performance achievements
    await this.checkPerformanceAchievements(prisma, userId, experimentType, score);

    return performance;
  }

  /**
   * Update Bayesian prior with new data
   */
  async updateBayesianPrior(prisma, userId, experimentType, score) {
    // Normalize score to 0-1 range (assuming scores are 0-100)
    const normalizedScore = score / 100;

    let prior = await prisma.bayesianPrior.findUnique({
      where: {
        userId_experimentType: {
          userId,
          experimentType
        }
      }
    });

    if (!prior) {
      // Create initial prior
      prior = await prisma.bayesianPrior.create({
        data: {
          userId,
          experimentType,
          priorMean: 0.5,
          priorVariance: 0.1,
          posteriorMean: normalizedScore,
          posteriorVariance: 0.05,
          sampleSize: 1
        }
      });
    } else {
      // Bayesian update
      const n = prior.sampleSize;
      const priorPrecision = 1 / prior.priorVariance;
      const dataPrecision = 10; // Assumed precision of each observation

      // Update posterior mean
      const posteriorPrecision = priorPrecision + (n + 1) * dataPrecision;
      const posteriorMean = (
        priorPrecision * prior.priorMean +
        n * dataPrecision * prior.posteriorMean +
        dataPrecision * normalizedScore
      ) / posteriorPrecision;
      const posteriorVariance = 1 / posteriorPrecision;

      prior = await prisma.bayesianPrior.update({
        where: {
          userId_experimentType: {
            userId,
            experimentType
          }
        },
        data: {
          posteriorMean,
          posteriorVariance,
          sampleSize: n + 1
        }
      });
    }

    return prior;
  }

  /**
   * Check and unlock performance-based achievements
   */
  async checkPerformanceAchievements(prisma, userId, experimentType, score) {
    const performanceMilestones = [
      { threshold: 60, key: 'score_60', name: 'Above Chance', tier: 'bronze', points: 15 },
      { threshold: 70, key: 'score_70', name: 'Strong Performance', tier: 'silver', points: 30 },
      { threshold: 80, key: 'score_80', name: 'Exceptional', tier: 'gold', points: 75 },
      { threshold: 90, key: 'score_90', name: 'Master Level', tier: 'platinum', points: 200 }
    ];

    for (const milestone of performanceMilestones) {
      if (score >= milestone.threshold) {
        await this.unlockAchievement(prisma, userId, milestone.key, {
          name: milestone.name,
          description: `Achieve a score of ${milestone.threshold}+ in any experiment`,
          category: 'performance',
          tier: milestone.tier,
          points: milestone.points,
          requirement: { minScore: milestone.threshold }
        });
      }
    }
  }

  /**
   * Get user stats summary
   */
  async getUserStats(prisma, userId) {
    const [streak, achievements, performanceHistory, bayesianPriors] = await Promise.all([
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' }
      }),
      prisma.performanceHistory.findMany({
        where: { userId },
        orderBy: { recordedAt: 'desc' },
        take: 50
      }),
      prisma.bayesianPrior.findMany({
        where: { userId }
      })
    ]);

    const totalPoints = achievements.reduce((sum, ua) => sum + ua.achievement.points, 0);

    return {
      streak: {
        current: streak?.currentStreak || 0,
        longest: streak?.longestStreak || 0,
        totalDaysActive: streak?.totalDaysActive || 0
      },
      achievements: {
        total: achievements.length,
        recentlyUnlocked: achievements.slice(0, 5),
        totalPoints
      },
      performance: {
        recentScores: performanceHistory.slice(0, 10),
        totalExperiments: performanceHistory.length
      },
      bayesianEstimates: bayesianPriors.map(prior => ({
        experimentType: prior.experimentType,
        estimatedPerformance: (prior.posteriorMean * 100).toFixed(1),
        uncertainty: (Math.sqrt(prior.posteriorVariance) * 100).toFixed(1),
        sampleSize: prior.sampleSize
      }))
    };
  }

  /**
   * Initialize default achievements
   */
  async initializeAchievements(prisma) {
    const defaultAchievements = [
      {
        key: 'first_experiment',
        name: 'First Step',
        description: 'Complete your first experiment',
        category: 'milestone',
        tier: 'bronze',
        points: 10,
        requirement: { experiments: 1 }
      },
      {
        key: 'experiments_10',
        name: 'Dedicated Researcher',
        description: 'Complete 10 experiments',
        category: 'milestone',
        tier: 'silver',
        points: 50,
        requirement: { experiments: 10 }
      },
      {
        key: 'experiments_50',
        name: 'Veteran Explorer',
        description: 'Complete 50 experiments',
        category: 'milestone',
        tier: 'gold',
        points: 150,
        requirement: { experiments: 50 }
      }
    ];

    for (const achData of defaultAchievements) {
      await prisma.achievement.upsert({
        where: { key: achData.key },
        update: {},
        create: achData
      });
    }

    console.log('[Gamification] Default achievements initialized');
  }
}

module.exports = new GamificationService();
