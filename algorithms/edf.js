/**
 * Earliest Deadline First (EDF)
 * ----------------------------------------------------------
 * A different lens on the same problem: instead of maximizing value,
 * order requests purely by urgency (deadline). Useful as a secondary
 * sort/tiebreaker, and as its own report so admins can see "what's most
 * urgent right now" separately from "what the optimizer chose".
 *
 * Classic use: single-machine deadline scheduling / job sequencing with
 * deadlines (each job has a deadline and profit, decide which to run).
 * Here we just expose the ranking; the DP scheduler is what actually
 * allocates the resource.
 */

function rankByUrgency(requests, now = Date.now()) {
  return [...requests].sort((a, b) => {
    const aDeadline = a.deadline ?? Infinity;
    const bDeadline = b.deadline ?? Infinity;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;
    return (b.priority ?? 0) - (a.priority ?? 0); // tie-break on priority
  });
}

module.exports = { rankByUrgency };
