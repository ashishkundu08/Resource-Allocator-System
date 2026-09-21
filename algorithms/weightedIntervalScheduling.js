/**
 * Weighted Interval Scheduling (DP + Binary Search)
 * ----------------------------------------------------------
 * This is THE core algorithm of the whole project.
 *
 * Problem: given n requests for the SAME resource, each with a
 * [start, end) window and a "value" (effective priority), pick a
 * subset of NON-OVERLAPPING requests that maximizes total value.
 *
 * This is NOT the same as greedy activity selection (which maximizes
 * *count* of accepted jobs assuming equal weight). Here jobs have
 * different weights, so greedy-by-end-time can be provably suboptimal.
 * The DP below is the textbook optimal solution (CLRS / Kleinberg-Tardos).
 *
 * Steps:
 *  1. Sort jobs by end time.                              O(n log n)
 *  2. For each job i, binary-search for p(i) = the latest job that
 *     finishes at or before job i starts (i.e. compatible).  O(log n) each
 *  3. DP: OPT[i] = max( OPT[i-1],  value[i] + OPT[p(i)] )
 *     "skip job i"  vs  "take job i + best compatible before it"
 *  4. Reconstruct the chosen subset by walking the decisions backward.
 *
 * Total time: O(n log n). Total space: O(n).
 */

const { effectivePriority } = require('./scoring');

/**
 * Binary search for p(i): the largest index j < i such that
 * jobs[j].end <= jobs[i].start. Returns -1 if none exists.
 */
function findLatestCompatible(jobs, i) {
  let lo = 0;
  let hi = i - 1;
  let result = -1;
  const target = jobs[i].start;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (jobs[mid].end <= target) {
      result = mid;
      lo = mid + 1; // try to find something later, still compatible
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

/**
 * @param {Array} requests - [{ id, start, end, priority, deadline, createdAt }]
 * @param {number} now - reference time for scoring (ms epoch)
 * @returns {{ allocated: Array, rejected: Array, totalValue: number }}
 */
function scheduleOptimal(requests, now = Date.now()) {
  if (requests.length === 0) {
    return { allocated: [], rejected: [], totalValue: 0 };
  }

  // Attach computed value + sort by end time (required for the DP).
  const jobs = requests
    .map((r) => ({ ...r, value: effectivePriority(r, now) }))
    .sort((a, b) => a.end - b.end);

  const n = jobs.length;
  const p = jobs.map((_, i) => findLatestCompatible(jobs, i));

  // OPT[i] = best total value using jobs[0..i-1] (1-indexed for clean base case)
  const OPT = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    const job = jobs[i - 1];
    const includeValue = job.value + OPT[p[i - 1] + 1];
    const excludeValue = OPT[i - 1];
    OPT[i] = Math.max(includeValue, excludeValue);
  }

  // Reconstruct which jobs were included.
  const allocatedSet = new Set();
  let i = n;
  while (i > 0) {
    const job = jobs[i - 1];
    const includeValue = job.value + OPT[p[i - 1] + 1];
    if (includeValue > OPT[i - 1]) {
      allocatedSet.add(job.id);
      i = p[i - 1] + 1;
    } else {
      i = i - 1;
    }
  }

  const allocated = jobs.filter((j) => allocatedSet.has(j.id));
  const rejected = jobs.filter((j) => !allocatedSet.has(j.id));

  return { allocated, rejected, totalValue: OPT[n] };
}

module.exports = { scheduleOptimal, findLatestCompatible };
