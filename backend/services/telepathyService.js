/**
 * Telepathy Service - Ghost Signal Protocol
 * Orchestrates the 2-player async telepathy experiment flow:
 * 1. Match - pair sender + receiver
 * 2. Commit - AI generates target + distractors, hashes to blockchain
 * 3. Send Phase - sender views target, provides 3 tags
 * 4. Mandatory Delay - blockchain-enforced wait
 * 5. Receive Phase - receiver provides tags, views grid, selects image
 * 6. Reveal - smart contract releases, scorer runs
 * 7. Score - CLIP + Psi-Coefficient + tag overlap
 */

const crypto = require('crypto');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

class TelepathyService {
  /**
   * Create a new telepathy session as sender
   */
  async createSession(senderId, options = {}) {
    const { delayMinutes = 30, inviteCode = null } = options;

    // Generate target + distractors via AI service
    const targetResult = await this._generateTarget();
    const distractorResult = await this._generateDistractors(
      targetResult.image_url,
      targetResult.prompt
    );

    const distractorUrls = distractorResult.distractors
      .filter(d => d.image_url)
      .map(d => d.image_url);
    const distractorCIDs = distractorResult.distractors
      .filter(d => d.cid)
      .map(d => d.cid);

    // Generate invite code if not provided
    const sessionInviteCode = inviteCode || crypto.randomBytes(6).toString('hex');

    const session = await prisma.telepathySession.create({
      data: {
        senderId,
        status: 'awaiting_receiver',
        targetCID: targetResult.cid || null,
        targetImageUrl: targetResult.image_url || null,
        targetDescription: targetResult.prompt || null,
        distractorCIDs,
        distractorUrls,
        delayMinutes,
        inviteCode: sessionInviteCode,
        blockchainMode: 'guest',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24hr expiry
      },
    });

    return {
      sessionId: session.id,
      inviteCode: sessionInviteCode,
      status: session.status,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Join a telepathy session as receiver
   */
  async joinSession(receiverId, { sessionId, inviteCode }) {
    let session;

    if (inviteCode) {
      session = await prisma.telepathySession.findUnique({
        where: { inviteCode },
      });
    } else if (sessionId) {
      session = await prisma.telepathySession.findUnique({
        where: { id: sessionId },
      });
    }

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'awaiting_receiver') {
      throw new Error(`Session is not awaiting a receiver (status: ${session.status})`);
    }

    if (session.senderId === receiverId) {
      throw new Error('Cannot join your own session as receiver');
    }

    if (session.expiresAt && new Date() > session.expiresAt) {
      await prisma.telepathySession.update({
        where: { id: session.id },
        data: { status: 'expired' },
      });
      throw new Error('Session has expired');
    }

    const updated = await prisma.telepathySession.update({
      where: { id: session.id },
      data: {
        receiverId,
        status: 'sending',
      },
    });

    return {
      sessionId: updated.id,
      status: updated.status,
      role: 'receiver',
    };
  }

  /**
   * Auto-match: join the matchmaking queue
   */
  async joinMatchQueue(userId, role = 'any', preferredDelay = 30) {
    // Check for existing pending match
    const existingMatch = await prisma.telepathyMatch.findFirst({
      where: {
        status: 'waiting',
        userId: { not: userId },
        role: role === 'sender' ? 'receiver' : role === 'receiver' ? 'sender' : undefined,
      },
      orderBy: { queuedAt: 'asc' },
    });

    if (existingMatch) {
      // Match found - create session
      const senderUserId = role === 'receiver' ? existingMatch.userId : userId;
      const receiverUserId = role === 'receiver' ? userId : existingMatch.userId;

      const session = await this.createSession(senderUserId, {
        delayMinutes: preferredDelay,
      });

      await this.joinSession(receiverUserId, { sessionId: session.sessionId });

      await prisma.telepathyMatch.update({
        where: { id: existingMatch.id },
        data: {
          status: 'matched',
          matchedWith: userId,
          sessionId: session.sessionId,
          matchedAt: new Date(),
        },
      });

      return {
        matched: true,
        sessionId: session.sessionId,
        role: role === 'receiver' ? 'receiver' : 'sender',
      };
    }

    // No match available - add to queue
    const match = await prisma.telepathyMatch.create({
      data: {
        userId,
        role,
        preferredDelay,
        status: 'waiting',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1hr queue expiry
      },
    });

    return {
      matched: false,
      matchId: match.id,
      position: await this._getQueuePosition(match.id),
    };
  }

  /**
   * Sender submits viewing confirmation and tags
   */
  async submitSenderTags(sessionId, senderId, tags) {
    const session = await prisma.telepathySession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.senderId !== senderId) {
      throw new Error('Session not found or unauthorized');
    }

    if (session.status !== 'sending') {
      throw new Error(`Invalid session status for sender submission: ${session.status}`);
    }

    if (!Array.isArray(tags) || tags.length !== 3) {
      throw new Error('Exactly 3 descriptive tags required');
    }

    // Generate salt and hash for on-chain commitment
    const salt = crypto.randomBytes(16).toString('hex');
    const tagsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(tags) + salt)
      .digest('hex');

    const now = new Date();
    const delayEndsAt = new Date(now.getTime() + session.delayMinutes * 60 * 1000);

    const updated = await prisma.telepathySession.update({
      where: { id: sessionId },
      data: {
        senderTags: tags,
        senderTagsHash: tagsHash,
        senderSalt: salt,
        senderViewedAt: now,
        senderSubmittedAt: now,
        delayStartedAt: now,
        delayEndsAt,
        status: 'delay',
      },
    });

    return {
      sessionId: updated.id,
      status: 'delay',
      delayEndsAt,
      tagsHash,
    };
  }

  /**
   * Check if delay period has elapsed
   */
  async checkDelay(sessionId) {
    const session = await prisma.telepathySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new Error('Session not found');

    const now = new Date();
    const delayComplete = session.delayEndsAt && now >= session.delayEndsAt;

    if (delayComplete && session.status === 'delay') {
      await prisma.telepathySession.update({
        where: { id: sessionId },
        data: { status: 'receiving' },
      });
    }

    return {
      sessionId,
      status: delayComplete ? 'receiving' : 'delay',
      delayEndsAt: session.delayEndsAt,
      remainingMs: delayComplete ? 0 : Math.max(0, session.delayEndsAt - now),
    };
  }

  /**
   * Receiver submits sensed tags and image choice
   */
  async submitReceiverResponse(sessionId, receiverId, { tags, choiceIndex }) {
    const session = await prisma.telepathySession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.receiverId !== receiverId) {
      throw new Error('Session not found or unauthorized');
    }

    if (session.status !== 'receiving') {
      throw new Error(`Invalid session status for receiver: ${session.status}`);
    }

    if (!Array.isArray(tags) || tags.length !== 3) {
      throw new Error('Exactly 3 sensed tags required');
    }

    if (choiceIndex < 0 || choiceIndex > 3) {
      throw new Error('Choice index must be 0-3');
    }

    // Determine which image was chosen
    const allImages = [session.targetImageUrl, ...session.distractorUrls];
    const chosenImageUrl = allImages[choiceIndex] || null;
    const chosenCID = choiceIndex === 0
      ? session.targetCID
      : (session.distractorCIDs[choiceIndex - 1] || null);

    const updated = await prisma.telepathySession.update({
      where: { id: sessionId },
      data: {
        receiverTags: tags,
        receiverChoice: choiceIndex,
        receiverChoiceCID: chosenCID,
        receiverSubmittedAt: new Date(),
        status: 'revealed',
      },
    });

    // Trigger scoring
    const scores = await this._scoreSession(updated);

    return {
      sessionId,
      status: 'scored',
      hit: choiceIndex === 0,  // Index 0 is always the target
      scores,
    };
  }

  /**
   * Get session details (role-appropriate view)
   */
  async getSession(sessionId, userId) {
    const session = await prisma.telepathySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new Error('Session not found');

    const isSender = session.senderId === userId;
    const isReceiver = session.receiverId === userId;

    if (!isSender && !isReceiver) {
      throw new Error('Not a participant in this session');
    }

    // Build role-appropriate response
    const base = {
      sessionId: session.id,
      status: session.status,
      role: isSender ? 'sender' : 'receiver',
      delayMinutes: session.delayMinutes,
      createdAt: session.createdAt,
    };

    if (isSender && session.status === 'sending') {
      // Sender can see target during sending phase
      return {
        ...base,
        targetImageUrl: session.targetImageUrl,
        targetCID: session.targetCID,
      };
    }

    if (isReceiver && session.status === 'receiving') {
      // Receiver sees the 4-image grid (shuffled)
      const grid = this._buildShuffledGrid(session);
      return { ...base, grid };
    }

    if (session.status === 'scored' || session.status === 'revealed') {
      return {
        ...base,
        targetImageUrl: session.targetImageUrl,
        distractorUrls: session.distractorUrls,
        senderTags: session.senderTags,
        receiverTags: session.receiverTags,
        receiverChoice: session.receiverChoice,
        hit: session.receiverChoice === 0,
        scores: {
          clipSimilarity: session.clipSimilarity,
          psiCoefficient: session.psiCoefficient,
          tagOverlapScore: session.tagOverlapScore,
          overallScore: session.overallScore,
        },
        scoringDetails: session.scoringDetails,
      };
    }

    if (session.status === 'delay') {
      return {
        ...base,
        delayStartedAt: session.delayStartedAt,
        delayEndsAt: session.delayEndsAt,
        remainingMs: Math.max(0, new Date(session.delayEndsAt) - new Date()),
      };
    }

    return base;
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId) {
    const sessions = await prisma.telepathySession.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: { not: 'expired' },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return sessions.map(s => ({
      sessionId: s.id,
      status: s.status,
      role: s.senderId === userId ? 'sender' : 'receiver',
      createdAt: s.createdAt,
      hit: s.receiverChoice === 0 && s.status === 'scored',
      overallScore: s.overallScore,
    }));
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  async _generateTarget() {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/generate/target`, {
        style: 'photorealistic',
      });
      return response.data;
    } catch (error) {
      console.error('[Telepathy] Target generation failed:', error.message);
      // Return a placeholder for development
      return {
        image_url: null,
        cid: null,
        prompt: 'A serene mountain landscape with a lake at sunset',
        seed: Math.floor(Math.random() * 2 ** 32),
      };
    }
  }

  async _generateDistractors(targetImageUrl, targetDescription) {
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/distractors/adversarial`, {
        target_image_url: targetImageUrl,
        target_description: targetDescription,
        num_distractors: 3,
        min_similarity: 0.7,
      });
      return response.data;
    } catch (error) {
      console.error('[Telepathy] Distractor generation failed:', error.message);
      return { distractors: [] };
    }
  }

  async _scoreSession(session) {
    let clipSimilarity = null;
    let psiCoefficient = null;
    let tagOverlapScore = null;

    // CLIP similarity scoring
    if (session.targetImageUrl && session.receiverChoiceCID) {
      try {
        const chosenUrl = session.receiverChoice === 0
          ? session.targetImageUrl
          : session.distractorUrls[session.receiverChoice - 1];

        const clipResult = await axios.post(`${AI_SERVICE_URL}/score/image-similarity`, {
          target_image_url: session.targetImageUrl,
          choice_image_url: chosenUrl,
          distractor_image_urls: session.distractorUrls,
        });
        clipSimilarity = clipResult.data.target_choice_similarity || null;
        psiCoefficient = clipResult.data.psi_coefficient?.psi || null;
      } catch (error) {
        console.error('[Telepathy] CLIP scoring failed:', error.message);
      }
    }

    // Tag semantic overlap
    tagOverlapScore = this._calculateTagOverlap(session.senderTags, session.receiverTags);

    // Overall composite score
    const hitBonus = session.receiverChoice === 0 ? 0.5 : 0;
    const overallScore = (
      (clipSimilarity || 0) * 0.3 +
      (psiCoefficient ? Math.max(0, psiCoefficient / 3) : 0) * 0.3 +
      tagOverlapScore * 0.2 +
      hitBonus * 0.2
    );

    await prisma.telepathySession.update({
      where: { id: session.id },
      data: {
        clipSimilarity,
        psiCoefficient,
        tagOverlapScore,
        overallScore,
        status: 'scored',
        scoringDetails: {
          hitBonus,
          clipSimilarity,
          psiCoefficient,
          tagOverlapScore,
          receiverChoseTarget: session.receiverChoice === 0,
        },
      },
    });

    return { clipSimilarity, psiCoefficient, tagOverlapScore, overallScore };
  }

  _calculateTagOverlap(senderTags, receiverTags) {
    if (!senderTags?.length || !receiverTags?.length) return 0;

    let totalScore = 0;
    const senderLower = senderTags.map(t => t.toLowerCase());
    const receiverLower = receiverTags.map(t => t.toLowerCase());

    for (const rTag of receiverLower) {
      let bestMatch = 0;
      for (const sTag of senderLower) {
        if (rTag === sTag) {
          bestMatch = 1.0;
        } else if (rTag.includes(sTag) || sTag.includes(rTag)) {
          bestMatch = Math.max(bestMatch, 0.7);
        } else {
          // Simple word overlap
          const rWords = new Set(rTag.split(/\s+/));
          const sWords = new Set(sTag.split(/\s+/));
          const intersection = [...rWords].filter(w => sWords.has(w));
          const union = new Set([...rWords, ...sWords]);
          const jaccard = union.size > 0 ? intersection.length / union.size : 0;
          bestMatch = Math.max(bestMatch, jaccard);
        }
      }
      totalScore += bestMatch;
    }

    return totalScore / receiverTags.length;
  }

  _buildShuffledGrid(session) {
    // Target is always index 0 internally, but we shuffle for display
    const images = [
      { url: session.targetImageUrl, cid: session.targetCID, originalIndex: 0 },
      ...session.distractorUrls.map((url, i) => ({
        url,
        cid: session.distractorCIDs[i] || null,
        originalIndex: i + 1,
      })),
    ];

    // Fisher-Yates shuffle
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }

    // Create mapping so we know which display index = target
    const targetDisplayIndex = images.findIndex(img => img.originalIndex === 0);

    return {
      images: images.map((img, displayIndex) => ({
        url: img.url,
        cid: img.cid,
        displayIndex,
      })),
      _targetDisplayIndex: targetDisplayIndex, // Not sent to client
    };
  }

  async _getQueuePosition(matchId) {
    const count = await prisma.telepathyMatch.count({
      where: { status: 'waiting', queuedAt: { lt: new Date() } },
    });
    return count;
  }
}

module.exports = new TelepathyService();
