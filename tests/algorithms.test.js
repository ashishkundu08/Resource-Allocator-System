const test = require('node:test');
const assert = require('node:assert');

const { findOverlaps, findAllConflicts, intervalsOverlap } = require('../algorithms/conflictDetection');
const { scheduleOptimal } = require('../algorithms/weightedIntervalScheduling');
const { greedyByEndTime, greedyByPriority } = require('../algorithms/greedyScheduling');
const { rankByUrgency } = require('../algorithms/edf');

// Fixed "now" so deadline/aging boosts don't make tests flaky.
const NOW = new Date('2026-01-01T00:00:00Z').getTime();
const hr = (h) => NOW + h * 60 * 60 * 1000;

test('intervalsOverlap: detects overlap and non-overlap correctly', () => {
  assert.equal(intervalsOverlap({ start: 1, end: 5 }, { start: 4, end: 8 }), true);
  assert.equal(intervalsOverlap({ start: 1, end: 5 }, { start: 5, end: 8 }), false); // touching, not overlapping
  assert.equal(intervalsOverlap({ start: 1, end: 5 }, { start: 6, end: 8 }), false);
});

test('findOverlaps: finds conflicting requests for a candidate', () => {
  const existing = [
    { id: 'A', start: hr(2), end: hr(5) },
    { id: 'B', start: hr(6), end: hr(8) },
  ];
  const candidate = { id: 'C', start: hr(3), end: hr(6) };
  const overlaps = findOverlaps(existing, candidate);
  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].id, 'A');
});

test('findAllConflicts: sweep line finds all overlapping pairs', () => {
  const requests = [
    { id: 'A', start: hr(0), end: hr(3) },
    { id: 'B', start: hr(2), end: hr(4) },
    { id: 'C', start: hr(5), end: hr(6) },
  ];
  const conflicts = findAllConflicts(requests);
  assert.equal(conflicts.length, 1);
  assert.deepEqual(conflicts[0].sort(), ['A', 'B']);
});

test('scheduleOptimal: picks the single job when only one exists', () => {
  const requests = [{ id: 'A', start: hr(0), end: hr(2), priority: 5 }];
  const { allocated, totalValue } = scheduleOptimal(requests, NOW);
  assert.equal(allocated.length, 1);
  assert.equal(allocated[0].id, 'A');
  assert.equal(totalValue, 5);
});

test('scheduleOptimal beats greedyByPriority on the classic counterexample', () => {
  // A: big overlapping job, high priority. B+C: two smaller jobs that
  // together outweigh A but individually don't.
  const requests = [
    { id: 'A', start: hr(9), end: hr(11), priority: 5 },
    { id: 'B', start: hr(9), end: hr(10), priority: 3 },
    { id: 'C', start: hr(10), end: hr(11), priority: 3 },
  ];

  const optimal = scheduleOptimal(requests, NOW);
  const greedy = greedyByPriority(requests, NOW);

  // Optimal should choose B + C (combined value 6) over A alone (value 5).
  const optimalIds = optimal.allocated.map((j) => j.id).sort();
  assert.deepEqual(optimalIds, ['B', 'C']);
  assert.equal(optimal.totalValue, 6);

  // Greedy-by-priority grabs A first (highest single priority) and then
  // can't fit B or C -> strictly worse total value. This is the proof
  // that greedy is suboptimal for weighted interval scheduling.
  assert.deepEqual(greedy.allocated.map((j) => j.id), ['A']);
  assert.equal(greedy.totalValue, 5);
  assert.ok(optimal.totalValue > greedy.totalValue, 'DP should beat greedy-by-priority here');
});

test('scheduleOptimal never returns overlapping allocations', () => {
  const requests = [
    { id: 'A', start: hr(0), end: hr(4), priority: 10 },
    { id: 'B', start: hr(1), end: hr(3), priority: 9 },
    { id: 'C', start: hr(4), end: hr(6), priority: 1 },
    { id: 'D', start: hr(5), end: hr(9), priority: 4 },
  ];
  const { allocated } = scheduleOptimal(requests, NOW);
  for (let i = 0; i < allocated.length; i++) {
    for (let j = i + 1; j < allocated.length; j++) {
      assert.ok(
        allocated[i].end <= allocated[j].start || allocated[j].end <= allocated[i].start,
        `${allocated[i].id} and ${allocated[j].id} should not overlap`
      );
    }
  }
});

test('greedyByEndTime matches optimal COUNT when all priorities are equal', () => {
  const requests = [
    { id: 'A', start: hr(0), end: hr(2), priority: 1 },
    { id: 'B', start: hr(1), end: hr(3), priority: 1 },
    { id: 'C', start: hr(3), end: hr(4), priority: 1 },
    { id: 'D', start: hr(0), end: hr(6), priority: 1 },
  ];
  const optimal = scheduleOptimal(requests, NOW);
  const greedy = greedyByEndTime(requests, NOW);
  // Both should find the max independent set: A, C (or B, C) -> 2 jobs
  assert.equal(optimal.allocated.length, greedy.allocated.length);
});

test('rankByUrgency: sooner deadline ranks first, priority tie-breaks', () => {
  const requests = [
    { id: 'A', deadline: hr(48), priority: 5 },
    { id: 'B', deadline: hr(2), priority: 1 },
    { id: 'C', deadline: hr(2), priority: 9 },
  ];
  const ranked = rankByUrgency(requests, NOW);
  assert.deepEqual(ranked.map((r) => r.id), ['C', 'B', 'A']);
});

test('scheduleOptimal handles empty input', () => {
  const { allocated, rejected, totalValue } = scheduleOptimal([], NOW);
  assert.deepEqual(allocated, []);
  assert.deepEqual(rejected, []);
  assert.equal(totalValue, 0);
});
