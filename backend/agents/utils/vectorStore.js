/**
 * Vector Store Manager
 * Handles embedding storage and retrieval using FAISS (local) or Pinecone (cloud)
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const llmHelper = require('./llmHelper');

class VectorStore {
  constructor() {
    this.type = config.vectorStore.type;
    this.index = null;
    this.documents = []; // In-memory document store
    this.initialized = false;
  }

  /**
   * Initialize the vector store
   */
  async initialize() {
    console.log(`[VectorStore] Initializing ${this.type} vector store...`);

    if (this.type === 'faiss') {
      await this.initializeFAISS();
    } else if (this.type === 'pinecone') {
      await this.initializePinecone();
    }

    this.initialized = true;
    console.log('[VectorStore] ✓ Vector store initialized');
  }

  /**
   * Initialize FAISS (local vector store)
   */
  async initializeFAISS() {
    try {
      // For MVP, use simple in-memory storage
      console.log('[VectorStore] Using in-memory vector store for MVP');

      const dataPath = path.join(__dirname, '../data/knowledge_base.json');

      // Create data directory if it doesn't exist
      const dataDir = path.dirname(dataPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Load existing knowledge base if available
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        this.documents = data.documents || [];
        console.log(`[VectorStore] Loaded ${this.documents.length} documents from disk`);
      } else {
        // Initialize with seed knowledge
        await this.seedKnowledgeBase();
      }
    } catch (error) {
      console.error('[VectorStore] FAISS initialization error:', error);
      this.documents = [];
    }
  }

  /**
   * Initialize Pinecone (cloud vector store)
   */
  async initializePinecone() {
    try {
      const { Pinecone } = require('@pinecone-database/pinecone');

      this.pinecone = new Pinecone({
        apiKey: config.vectorStore.pinecone.apiKey,
      });

      this.index = this.pinecone.index(config.vectorStore.pinecone.indexName);
      console.log('[VectorStore] ✓ Connected to Pinecone');
    } catch (error) {
      console.error('[VectorStore] Pinecone initialization error:', error);
      console.log('[VectorStore] Falling back to in-memory storage');
      await this.initializeFAISS();
    }
  }

  /**
   * Seed the knowledge base with initial documents
   */
  async seedKnowledgeBase() {
    console.log('[VectorStore] Seeding knowledge base...');

    const seedDocs = [
      {
        id: 'exp-remote-viewing',
        text: 'Remote viewing experiments in Cognosis allow participants to describe hidden images before they are revealed. Uses AI scoring to compare descriptions with actual targets.',
        metadata: { type: 'experiment', category: 'remote-viewing' },
      },
      {
        id: 'exp-card-prediction',
        text: 'Card prediction experiments test precognition by having users predict which card will be revealed. Tracks accuracy against baseline 25% chance.',
        metadata: { type: 'experiment', category: 'precognition' },
      },
      {
        id: 'exp-dream-journal',
        text: 'Dream journal experiments allow users to log dreams and track potential precognitive elements against future stimuli.',
        metadata: { type: 'experiment', category: 'consciousness' },
      },
      {
        id: 'tech-blockchain',
        text: 'Cognosis uses Midnight blockchain for commit-reveal protocol ensuring data integrity and preventing retroactive response changes.',
        metadata: { type: 'technology', category: 'blockchain' },
      },
      {
        id: 'tech-ai-scoring',
        text: 'AI scoring uses embeddings and models to evaluate similarity between user responses and target stimuli.',
        metadata: { type: 'technology', category: 'ai' },
      },
      {
        id: 'theory-orch-or',
        text: 'Orchestrated Objective Reduction (Orch-OR) theory by Hameroff and Penrose proposes quantum processes in microtubules underlie consciousness.',
        metadata: { type: 'theory', category: 'quantum-consciousness', doi: '10.1016/j.plrev.2013.08.002' },
      },
      {
        id: 'theory-qbd',
        text: 'Quantum Brain Dynamics (QBD) by Umezawa, Vitiello, and Ricciardi describes consciousness as quantum field interactions in the brain.',
        metadata: { type: 'theory', category: 'quantum-consciousness', doi: '10.1142/9789812813268_0001' },
      },
      {
        id: 'research-gcp',
        text: 'Global Consciousness Project studies correlations between global events and random number generator outputs, investigating collective consciousness.',
        metadata: { type: 'research', category: 'collective-consciousness', doi: '10.1016/j.explore.2011.03.004' },
      },
    ];

    for (const doc of seedDocs) {
      await this.addDocument(doc.id, doc.text, doc.metadata);
    }

    this.saveToFile();
    console.log(`[VectorStore] ✓ Seeded ${seedDocs.length} documents`);
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text) {
    try {
      return await llmHelper.generateEmbedding(text);
    } catch (error) {
      console.error('[VectorStore] Embedding generation error:', error.message);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  /**
   * Add a document to the vector store
   */
  async addDocument(id, text, metadata = {}) {
    const embedding = await this.generateEmbedding(text);

    const document = {
      id,
      text,
      metadata,
      embedding,
      createdAt: new Date().toISOString(),
    };

    // Remove existing document with same ID
    this.documents = this.documents.filter(doc => doc.id !== id);

    // Add new document
    this.documents.push(document);

    if (this.type === 'pinecone' && this.index) {
      try {
        await this.index.upsert([{
          id,
          values: embedding,
          metadata: { text, ...metadata },
        }]);
      } catch (error) {
        console.error('[VectorStore] Pinecone upsert error:', error);
      }
    }

    return document;
  }

  /**
   * Search for similar documents
   */
  async search(query, k = 5, filter = {}) {
    const queryEmbedding = await this.generateEmbedding(query);

    if (this.type === 'pinecone' && this.index) {
      return await this.searchPinecone(queryEmbedding, k, filter);
    } else {
      return await this.searchLocal(queryEmbedding, k, filter);
    }
  }

  /**
   * Local cosine similarity search
   */
  async searchLocal(queryEmbedding, k = 5, filter = {}) {
    // Calculate cosine similarity for all documents
    const results = this.documents.map(doc => {
      // Apply metadata filters
      if (Object.keys(filter).length > 0) {
        const matchesFilter = Object.entries(filter).every(([key, value]) => {
          return doc.metadata[key] === value;
        });
        if (!matchesFilter) return null;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      return {
        id: doc.id,
        text: doc.text,
        metadata: doc.metadata,
        score: similarity,
      };
    }).filter(Boolean);

    // Sort by similarity and return top k
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

  /**
   * Pinecone search
   */
  async searchPinecone(queryEmbedding, k = 5, filter = {}) {
    try {
      const results = await this.index.query({
        vector: queryEmbedding,
        topK: k,
        filter,
        includeMetadata: true,
      });

      return results.matches.map(match => ({
        id: match.id,
        text: match.metadata.text,
        metadata: match.metadata,
        score: match.score,
      }));
    } catch (error) {
      console.error('[VectorStore] Pinecone search error:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Save documents to file (for FAISS mode)
   */
  saveToFile() {
    if (this.type === 'faiss') {
      const dataPath = path.join(__dirname, '../data/knowledge_base.json');
      fs.writeFileSync(dataPath, JSON.stringify({ documents: this.documents }, null, 2));
    }
  }

  /**
   * Get all documents
   */
  getAllDocuments() {
    return this.documents;
  }

  /**
   * Get document by ID
   */
  getDocument(id) {
    return this.documents.find(doc => doc.id === id);
  }

  /**
   * Delete document
   */
  async deleteDocument(id) {
    this.documents = this.documents.filter(doc => doc.id !== id);

    if (this.type === 'pinecone' && this.index) {
      try {
        await this.index.delete1([id]);
      } catch (error) {
        console.error('[VectorStore] Pinecone delete error:', error);
      }
    }

    this.saveToFile();
  }
}

// Singleton instance
let vectorStoreInstance = null;

module.exports = {
  getVectorStore: () => {
    if (!vectorStoreInstance) {
      vectorStoreInstance = new VectorStore();
    }
    return vectorStoreInstance;
  },
};
