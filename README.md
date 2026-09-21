# Allocator — conflict-aware resource scheduling

Instead of rejecting overlapping requests for a shared resource (GPU, lab,
room, camera, equipment), this system finds the allocation that maximizes
total priority satisfied, using **weighted interval scheduling (DP + binary
search)** — not a naive greedy/first-come-first-served approach.

## Quick start

```bash
cd backend
npm install
npm start
# API + frontend at http://localhost:3000
```

Open `http://localhost:3000` in a browser. Add a resource, submit a couple
of overlapping requests with different priorities, click **Run allocation**,
and watch the timeline update.

Run the algorithm test suite (no extra install needed — uses Node's built-in
test runner):

```bash
npm test
```

## Architecture

Requests
│
▼
Conflict Detection (interval overlap check, O(n) / sweep O(n log n))
│
▼
Scoring (priority + deadline urgency + anti-starvation aging)
│
▼
Weighted Interval DP + binary search, O(n log n)
Scheduling (per resource) picks the max-value non-overlapping subset
│
▼
Allocation persisted; requests marked allocated / rejected


Greedy scheduling (`greedyScheduling.js`) and EDF ranking (`edf.js`) are
also implemented and run alongside the DP solver purely for **comparison** —
`/allocate` returns all three totals so you can see, on real data, that
greedy is provably suboptimal once priorities differ.

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/resources` | Register a resource `{ name, type }` |
| `GET` | `/resources` | List resources |
| `POST` | `/requests` | Submit a request `{ resourceId, team, start, end, priority, deadline }` (epoch ms). Returns an immediate conflict preview. |
| `GET` | `/requests?resourceId=&status=` | List requests |
| `DELETE` | `/requests/:id` | Cancel a pending request |
| `GET` | `/availability?resourceId=&start=&end=` | Check free/busy for a window |
| `POST` | `/allocate` | `{}` for all resources, or `{ resourceId }` for one. Runs the DP scheduler, persists allocations, returns allocated/rejected + greedy comparison |

## Why DP, not greedy

Given jobs with different priorities on the same resource, greedy
(by priority or by end time) is **not guaranteed optimal**. Classic
counterexample, also covered by a test in `tests/algorithms.test.js`:

Job A: 9–11, priority 5
Job B: 9–10, priority 3
Job C: 10–11, priority 3


Greedy-by-priority takes A (value 5) and can't fit B or C.
The DP solver takes B + C (value 6) — strictly better.

The DP (`weightedIntervalScheduling.js`) sorts by end time, and for each
job binary-searches for the latest job compatible with it (`p(i)`), then
fills a table `OPT[i] = max(skip, take + OPT[p(i)])`. This is the standard
CLRS/Kleinberg-Tardos weighted interval scheduling algorithm, O(n log n).

## What's deliberately simple (and how to extend it)

- **Storage** is a JSON file (`backend/data/db.json`), not a real database —
  chosen so the project runs with zero setup. Swapping in SQLite/Postgres
  means replacing `db.js`'s `readDb`/`writeDb` with real queries; the routes
  and algorithms don't need to change.
- **Concurrency**: writes go through an in-process lock (`withLock` in
  `db.js`) so two near-simultaneous `POST /allocate` calls can't race. A real
  DB would use transactions/row locks instead.
- **Auth**: none yet. Adding an `admin` vs `requester` role and gating
  `/allocate` to admins is a natural next step.
- **Re-optimization**: allocation only runs on demand (`POST /allocate`).
  A production version might re-run it whenever a request is cancelled, to
  backfill freed slots.

## Talking points for interviews

- Explain *why* greedy fails here and walk through the counterexample above.
- Explain the DP recurrence and why sorting by end time + binary search for
  `p(i)` gets you O(n log n) instead of O(n²).
- Explain the tradeoff in `scoring.js`: folding deadline urgency and
  wait-time aging into a single scalar "value" so the DP (which only
  understands one weight per job) still reflects real-world urgency and
  fairness.
- Explain the concurrency lock and what changes if this moves to a real
  database (transactions instead of an in-process queue).
