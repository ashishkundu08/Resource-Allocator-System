/**
 * Tiny JSON-file "database".
 * ----------------------------------------------------------
 * Chosen deliberately over SQLite/Postgres so the project runs with
 * `npm install && npm start` and ZERO native builds or DB setup.
 *
 * Schema (three tables, as arrays):
 *   resources:   { id, name, type }
 *   requests:    { id, resourceId, team, start, end, priority, deadline,
 *                  createdAt, status }   status: pending | allocated | rejected
 *   allocations: { id, resourceId, requestId, start, end, createdAt }
 *
 * Concurrency note: writes go through a simple in-process write queue
 * (see withLock) so two nearly-simultaneous POST /allocate calls for the
 * same resource can't race and double-write the file. In a real deployment
 * this responsibility moves to the DB via transactions/row locks.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ resources: [], requests: [], allocations: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// --- simple write lock so concurrent requests serialize instead of racing ---
let queue = Promise.resolve();
function withLock(fn) {
  const result = queue.then(() => fn());
  // Swallow errors in the queue chain so one failure doesn't wedge the lock,
  // but still propagate the error to the original caller via `result`.
  queue = result.catch(() => {});
  return result;
}

module.exports = { readDb, writeDb, withLock, DB_PATH };
