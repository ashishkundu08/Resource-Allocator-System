const express = require('express');
const crypto = require('crypto');
const { readDb, writeDb, withLock } = require('../db');

const router = express.Router();

// POST /resources { name, type }
router.post('/', async (req, res) => {
  const { name, type } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const resource = { id: crypto.randomUUID(), name, type: type || 'generic' };

  await withLock(() => {
    const db = readDb();
    db.resources.push(resource);
    writeDb(db);
  });

  res.status(201).json(resource);
});

// GET /resources
router.get('/', (req, res) => {
  const db = readDb();
  res.json(db.resources);
});

module.exports = router;
