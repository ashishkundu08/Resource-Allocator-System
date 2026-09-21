const express = require('express');
const crypto = require('crypto');
const { readDb, writeDb, withLock } = require('../db');
const { scheduleOptimal } = require('../algorithms/weightedIntervalScheduling');
const { greedyByEndTime, greedyByPriority } = require('../algorithms/greedyScheduling');
const { rankByUrgency } = require('../algorithms/edf');

const router = express.Router();

/**
 * POST /allocate { resourceId }  -> allocate just one resource
 * POST /allocate {}              -> allocate ALL resources with pending requests
 *
 * Pipeline:  pending requests -> DP-optimal weighted interval scheduling
 *            -> persist allocations -> mark requests allocated/rejected
 *
 * Also returns a greedy comparison purely for visibility/demo purposes
 * (this is what makes the "why not just greedy" interview answer concrete).
 */
router.post('/', async (req, res) => {
  const { resourceId } = req.body || {};
  const now = Date.now();

  const result = await withLock(() => {
    const db = readDb();

    const resourceIds = resourceId
      ? [resourceId]
      : [...new Set(db.requests.filter((r) => r.status === 'pending').map((r) => r.resourceId))];

    const report = [];

    for (const rId of resourceIds) {
      const pending = db.requests.filter((r) => r.resourceId === rId && r.status === 'pending');
      if (pending.length === 0) continue;

      const optimal = scheduleOptimal(pending, now);
      const greedyEnd = greedyByEndTime(pending, now);
      const greedyPrio = greedyByPriority(pending, now);
      const urgencyOrder = rankByUrgency(pending, now);

      const allocatedIds = new Set(optimal.allocated.map((j) => j.id));

      // Persist: update request statuses + create allocation records.
      db.requests = db.requests.map((r) => {
        if (r.resourceId !== rId || r.status !== 'pending') return r;
        return { ...r, status: allocatedIds.has(r.id) ? 'allocated' : 'rejected' };
      });

      const newAllocations = optimal.allocated.map((job) => ({
        id: crypto.randomUUID(),
        resourceId: rId,
        requestId: job.id,
        start: job.start,
        end: job.end,
        createdAt: now,
      }));
      db.allocations.push(...newAllocations);

      report.push({
        resourceId: rId,
        allocated: optimal.allocated.map((j) => ({ id: j.id, team: j.team, start: j.start, end: j.end, value: j.value })),
        rejected: optimal.rejected.map((j) => ({ id: j.id, team: j.team, start: j.start, end: j.end, value: j.value })),
        totalValue: optimal.totalValue,
        comparison: {
          dpOptimal: optimal.totalValue,
          greedyByEndTime: greedyEnd.totalValue,
          greedyByPriority: greedyPrio.totalValue,
        },
        mostUrgentOrder: urgencyOrder.map((r) => ({ id: r.id, team: r.team, deadline: r.deadline })),
      });
    }

    writeDb(db);
    return report;
  });

  res.json({ ranAt: now, resources: result });
});

module.exports = router;
