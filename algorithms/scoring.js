/**
 * Scoring
 * ----------------------------------------------------------
 * Turns (priority, deadline, createdAt) into a single numeric "value"
 * used as the weight in the weighted interval scheduling DP.
 *
 * Two real-world concerns folded in:
 *  1. Deadline urgency  -> a request due in 1 hour should outrank an
 *     equal-priority request due next week (Earliest-Deadline-style boost).
 *  2. Anti-starvation   -> a low-priority request that has been waiting a
 *     long time slowly gains value, so it can't be bumped forever by a
 *     stream of new high-priority requests.
 */

const MS_PER_HOUR = 1000 * 60 * 60;

function urgencyBoost(deadline, now) {
  if (!deadline) return 0;
  const hoursLeft = (deadline - now) / MS_PER_HOUR;
  if (hoursLeft <= 0) return 5; // overdue -> max urgency
  // Boost shrinks the further away the deadline is; caps at 5.
  return Math.max(0, 5 - Math.log2(hoursLeft + 1));
}

function agingBoost(createdAt, now) {
  if (!createdAt) return 0;
  const hoursWaiting = (now - createdAt) / MS_PER_HOUR;
  // +0.1 per hour waited, capped so it can't dominate priority entirely.
  return Math.min(3, hoursWaiting * 0.1);
}

/** Effective value used as the DP weight. */
function effectivePriority(request, now = Date.now()) {
  const base = request.priority ?? 1;
  return base + urgencyBoost(request.deadline, now) + agingBoost(request.createdAt, now);
}

module.exports = { effectivePriority, urgencyBoost, agingBoost };
