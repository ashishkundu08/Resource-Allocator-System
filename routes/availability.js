const express = require('express');
const { readDb } = require('../db');
const { intervalsOverlap } = require('../algorithms/conflictDetection');

const router = express.Router();

// GET /availability?resourceId=&start=&end=
// Returns whether the resource is free for that window, and what's booked.
router.get('/', (req, res) => {
  const { resourceId, start, end } = req.query;
  if (!resourceId || start == null || end == null) {
    return res.status(400).json({ error: 'resourceId, start, end query params are required' });
  }

  const window = { start: Number(start), end: Number(end) };
  const db = readDb();

  const allocationsForResource = db.allocations.filter((a) => a.resourceId === resourceId);
  const clashing = allocationsForResource.filter((a) => intervalsOverlap(a, window));

  res.json({
    resourceId,
    window,
    free: clashing.length === 0,
    clashingAllocations: clashing,
  });
});

module.exports = router;
