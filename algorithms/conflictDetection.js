/**
 * Conflict Detection
 * ----------------------------------------------------------
 * DSA concept: Interval overlap check.
 * Two intervals [s1, e1) and [s2, e2) overlap iff s1 < e2 AND s2 < e1.
 *
 * findOverlaps() checks a single new request against a list of existing
 * requests for the SAME resource, in O(n).
 *
 * findAllConflicts() finds every overlapping pair inside a list, using the
 * classic "sort by start time + sweep" technique in O(n log n) instead of
 * the naive O(n^2) pairwise comparison.
 */

function intervalsOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

/** Check one candidate request against a list of existing ones. O(n). */
function findOverlaps(existingRequests, candidate) {
  return existingRequests.filter(
    (r) => r.id !== candidate.id && intervalsOverlap(r, candidate)
  );
}

/**
 * Sweep-line conflict detection across a whole list.
 * Sort by start time, then walk through keeping track of the "current"
 * busiest interval; whenever the next interval starts before the previous
 * one ends, we have a conflict pair. O(n log n).
 */
function findAllConflicts(requests) {
  const sorted = [...requests].sort((a, b) => a.start - b.start);
  const conflicts = [];

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].start >= sorted[i].end) break; // sorted by start -> no more overlaps possible for i
      if (intervalsOverlap(sorted[i], sorted[j])) {
        conflicts.push([sorted[i].id, sorted[j].id]);
      }
    }
  }
  return conflicts;
}

module.exports = { intervalsOverlap, findOverlaps, findAllConflicts };
