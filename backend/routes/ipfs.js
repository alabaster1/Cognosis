/**
 * IPFS Routes - Backend proxy for Pinata API
 * /api/ipfs/*
 */

const express = require('express');
const axios = require('axios');
const { authMiddleware } = require('../auth');

const router = express.Router();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

function ensurePinataConfig() {
  if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    throw new Error('PINATA_API_KEY and PINATA_API_SECRET environment variables are required');
  }
}

/**
 * POST /api/ipfs/pin
 * Pin JSON data to IPFS via Pinata
 */
router.post('/pin', authMiddleware, async (req, res) => {
  try {
    ensurePinataConfig();

    const { content, metadata } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const body = {
      pinataContent: content,
      pinataMetadata: {
        name: metadata?.name || `Cognosis_${Date.now()}`,
        keyvalues: metadata?.keyvalues || {},
      },
    };

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      body,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      success: true,
      ipfsHash: response.data.IpfsHash,
      pinSize: response.data.PinSize,
      timestamp: response.data.Timestamp,
    });
  } catch (error) {
    console.error('IPFS pin error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to pin to IPFS',
    });
  }
});

/**
 * DELETE /api/ipfs/unpin/:cid
 * Unpin data from Pinata
 */
router.delete('/unpin/:cid', authMiddleware, async (req, res) => {
  try {
    ensurePinataConfig();

    const { cid } = req.params;
    if (!cid) {
      return res.status(400).json({ error: 'CID is required' });
    }

    await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
      },
    });

    res.json({ success: true, message: `Unpinned ${cid}` });
  } catch (error) {
    console.error('IPFS unpin error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to unpin from IPFS',
    });
  }
});

module.exports = router;
