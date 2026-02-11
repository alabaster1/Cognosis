const { ethers } = require('ethers');
const crypto = require('crypto');

// Smart contract ABI (simplified for MVP)
const CONTRACT_ABI = [
  "function createExperiment(string experimentId, bytes32 targetHash) public",
  "function submitResponse(string experimentId, bytes32 responseHash, string responseIpfsHash) public",
  "function revealAndScore(string experimentId, bytes32 targetHashConfirmation, uint256 score) public",
  "function getExperiment(string experimentId) public view returns (string, address, bytes32, bytes32, string, uint256, uint256, bool, bool)",
  "function getUserExperiments(address user) public view returns (string[] memory)",
  "function getAllExperiments() public view returns (string[] memory)",
  "event ExperimentCreated(string indexed experimentId, address indexed participant, bytes32 targetHash, uint256 timestamp)",
  "event ResponseSubmitted(string indexed experimentId, address indexed participant, bytes32 responseHash, string responseIpfsHash, uint256 timestamp)",
  "event TargetRevealed(string indexed experimentId, address indexed participant, bytes32 targetHash, uint256 score, uint256 timestamp)"
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.initialized = false;

    // In-memory storage for MVP (simulates blockchain)
    this.experiments = new Map();
    this.userExperiments = new Map();
  }

  async initialize() {
    try {
      // For MVP, we'll use in-memory storage
      // In production, connect to Ethereum node:
      // this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
      // const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
      // this.contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

      this.initialized = true;
      console.log('✓ Blockchain service initialized (MVP mode - in-memory)');
    } catch (error) {
      console.error('Blockchain initialization error:', error);
      throw error;
    }
  }

  async commitTarget(targetHash, walletAddress) {
    if (!this.initialized) {
      await this.initialize();
    }

    const experimentId = this.generateExperimentId();
    const timestamp = Date.now();

    const experiment = {
      id: experimentId,
      walletAddress: walletAddress.toLowerCase(),
      targetHash,
      responseHash: null,
      responseIpfsHash: null,
      score: null,
      timestamp,
      responseSubmitted: false,
      revealed: false
    };

    this.experiments.set(experimentId, experiment);

    if (!this.userExperiments.has(walletAddress.toLowerCase())) {
      this.userExperiments.set(walletAddress.toLowerCase(), []);
    }
    this.userExperiments.get(walletAddress.toLowerCase()).push(experimentId);

    // In production, this would be a blockchain transaction:
    // const tx = await this.contract.createExperiment(experimentId, targetHash);
    // const receipt = await tx.wait();

    return {
      experimentId,
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`, // Mock tx hash
      blockNumber: Math.floor(Math.random() * 1000000),
      timestamp
    };
  }

  async submitResponse(experimentId, responseHash, ipfsHash) {
    if (!this.initialized) {
      await this.initialize();
    }

    const experiment = this.experiments.get(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    if (experiment.responseSubmitted) {
      throw new Error('Response already submitted');
    }

    experiment.responseHash = responseHash;
    experiment.responseIpfsHash = ipfsHash;
    experiment.responseSubmitted = true;

    // In production:
    // const tx = await this.contract.submitResponse(experimentId, responseHash, ipfsHash);
    // const receipt = await tx.wait();

    return {
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      blockNumber: Math.floor(Math.random() * 1000000)
    };
  }

  async revealAndScore(experimentId, targetHash, score) {
    if (!this.initialized) {
      await this.initialize();
    }

    const experiment = this.experiments.get(experimentId);

    if (!experiment) {
      throw new Error('Experiment not found');
    }

    if (!experiment.responseSubmitted) {
      throw new Error('Response not submitted');
    }

    if (experiment.revealed) {
      throw new Error('Already revealed');
    }

    if (experiment.targetHash !== targetHash) {
      throw new Error('Target hash mismatch');
    }

    // Store score as integer (percentage * 100)
    experiment.score = Math.round(score * 10000) / 10000;
    experiment.revealed = true;

    // In production:
    // const scoreInt = Math.round(score * 10000);
    // const tx = await this.contract.revealAndScore(experimentId, targetHash, scoreInt);
    // const receipt = await tx.wait();

    return {
      txHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      blockNumber: Math.floor(Math.random() * 1000000)
    };
  }

  async getExperiment(experimentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const experiment = this.experiments.get(experimentId);

    if (!experiment) {
      return null;
    }

    return { ...experiment };
  }

  async getUserExperiments(walletAddress) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Handle null/undefined wallet address (guest users)
    if (!walletAddress) {
      return [];
    }

    const experimentIds = this.userExperiments.get(walletAddress.toLowerCase()) || [];

    return experimentIds.map(id => this.experiments.get(id)).filter(e => e);
  }

  async getAllExperiments() {
    if (!this.initialized) {
      await this.initialize();
    }

    return Array.from(this.experiments.values());
  }

  generateExperimentId() {
    return `exp_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

module.exports = new BlockchainService();
