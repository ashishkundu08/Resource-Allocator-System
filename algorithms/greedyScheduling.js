/**
 * Greedy Scheduling (baseline, for comparison against the DP-optimal solver)
 * ----------------------------------------------------------
 * Two classic greedy strategies, both O(n log n):
 *
 * 1. greedyByEndTime: classic "activity selection" - sort by end time,
 *    greedily take any job compatible with the last one taken.
 *    OPTIMAL when all jobs have EQUAL weight (maximizes count).
 *    NOT optimal when weights differ - this is the point we prove.
 *
 * 2. greedyByPriority: sort by value descending, greedily take a job if
 *    it doesn't conflict with anything already taken. Intuitive, but also
 *    not guaranteed optimal (a high-priority job can block two lower but
 *    combined-higher-value jobs).
 *
 * Classic counterexample used to demonstrate why greedy fails and DP wins:
 *   Job A: 9:00-11:00, value 5
 *   Job B: 9:00-10:00, value 3
 *   Job C: 10:00-11:00, value 3
 *   greedyByPriority takes A (value 5). Optimal takes B + C (value 6).
 */

const { effectivePriority } = require('./scoring');
const { intervalsOverlap } = require('./conflictDetection');

function greedyByEndTime(requests, now = Date.now()) {
  const jobs = requests
    .map((r) => ({ ...r, value: effectivePriority(r, now) }))
    .sort((a, b) => a.end - b.end);

  const allocated = [];
  let lastEnd = -Infinity;
  for (const job of jobs) {
    if (job.start >= lastEnd) {
      allocated.push(job);
      lastEnd = job.end;
    }
  }
  const allocatedIds = new Set(allocated.map((j) => j.id));
  const rejected = jobs.filter((j) => !allocatedIds.has(j.id));
  const totalValue = allocated.reduce((sum, j) => sum + j.value, 0);
  return { allocated, rejected, totalValue };
}

function greedyByPriority(requests, now = Date.now()) {
  const jobs = requests
    .map((r) => ({ ...r, value: effectivePriority(r, now) }))
    .sort((a, b) => b.value - a.value);

  const allocated = [];
  for (const job of jobs) {
    const conflicts = allocated.some((a) => intervalsOverlap(a, job));
    if (!conflicts) allocated.push(job);
  }
  const allocatedIds = new Set(allocated.map((j) => j.id));
  const rejected = jobs.filter((j) => !allocatedIds.has(j.id));
  const totalValue = allocated.reduce((sum, j) => sum + j.value, 0);
  return { allocated, rejected, totalValue };
}

module.exports = { greedyByEndTime, greedyByPriority };
