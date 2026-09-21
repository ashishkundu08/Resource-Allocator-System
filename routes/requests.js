const express = require('express');
const crypto = require('crypto');
const { readDb, writeDb, withLock } = require('../db');
const { findOverlaps } = require('../algorithms/conflictDetection');

const router = express.Router();

// POST /requests { resourceId, team, start, end, priority, deadline }
// start/end/deadline are epoch ms. Creates a PENDING request and returns
// an immediate conflict preview (does not reject - allocation decides that).
router.post('/', async (req, res) => {
  const { resourceId, team, start, end, priority, deadline } = req.body;

  if (!resourceId || !team || start == null || end == null) {
    return res.status(400).json({ error: 'resourceId, team, start, end are required' });
  }
  if (Number(start) >= Number(end)) {
    return res.status(400).json({ error: 'start must be before end' });
  }

  const request = {
    id: crypto.randomUUID(),
    resourceId,
    team,
    start: Number(start),
    end: Number(end),
    priority: priority != null ? Number(priority) : 1,
    deadline: deadline != null ? Number(deadline) : null,
    createdAt: Date.now(),
    status: 'pending',
  };

  const conflictPreview = await withLock(() => {
    const db = readDb();
    const resourceExists = db.resources.some((r) => r.id === resourceId);
    if (!resourceExists) return { error: 'resource not found' };

    const existingForResource = db.requests.filter(
      (r) => r.resourceId === resourceId && r.status !== 'rejected'
    );
    const overlaps = findOverlaps(existingForResource, request);

    db.requests.push(request);
    writeDb(db);
    return { overlaps };
  });

  if (conflictPreview.error) return res.status(404).json(conflictPreview);

  res.status(201).json({
    request,
    conflictsWith: conflictPreview.overlaps.map((r) => ({ id: r.id, team: r.team, start: r.start, end: r.end })),
    note:
      conflictPreview.overlaps.length > 0
        ? 'Overlapping requests exist. Run POST /allocate to resolve who gets the resource.'
        : 'No conflicts right now.',
  });
});

// GET /requests?resourceId=&status=
router.get('/', (req, res) => {
  const { resourceId, status } = req.query;
  const db = readDb();
  let results = db.requests;
  if (resourceId) results = results.filter((r) => r.resourceId === resourceId);
  if (status) results = results.filter((r) => r.status === status);
  res.json(results);
});

// DELETE /requests/:id - cancel a pending request
router.delete('/:id', async (req, res) => {
  const result = await withLock(() => {
    const db = readDb();
    const idx = db.requests.findIndex((r) => r.id === req.params.id);
    if (idx === -1) return { notFound: true };
    db.requests.splice(idx, 1);
    db.allocations = db.allocations.filter((a) => a.requestId !== req.params.id);
    writeDb(db);
    return { ok: true };
  });

  if (result.notFound) return res.status(404).json({ error: 'request not found' });
  res.json({ deleted: true });
});

module.exports = router;
