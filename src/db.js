import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/foodgen.db';

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS plans (
    id         TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    title      TEXT NOT NULL,
    data       TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS plans_created_at ON plans (created_at DESC);
`);

/** 128 bits of entropy — an unguessable plan URL is the only access control. */
function newId() {
  return randomBytes(16).toString('base64url');
}

const insert = db.prepare('INSERT INTO plans (id, created_at, title, data) VALUES (?, ?, ?, ?)');
const selectOne = db.prepare('SELECT id, created_at, title, data FROM plans WHERE id = ?');
const selectRecent = db.prepare('SELECT id, created_at, title FROM plans ORDER BY created_at DESC LIMIT ?');
const selectRecentFull = db.prepare('SELECT id, created_at, title, data FROM plans ORDER BY created_at DESC LIMIT ?');
const updateOne = db.prepare('UPDATE plans SET data = ? WHERE id = ?');
const deleteOne = db.prepare('DELETE FROM plans WHERE id = ?');
const deleteOld = db.prepare('DELETE FROM plans WHERE created_at < ?');

export function savePlan(plan) {
  const id = newId();
  const createdAt = new Date().toISOString();
  insert.run(id, createdAt, plan.title, JSON.stringify(plan));
  return { id, createdAt };
}

export function getPlan(id) {
  const row = selectOne.get(id);
  if (!row) return null;
  return { id: row.id, createdAt: row.created_at, plan: JSON.parse(row.data) };
}

export function recentPlans(limit = 10) {
  return selectRecent.all(Math.min(Math.max(limit, 1), 50)).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    title: r.title,
  }));
}

export function updatePlan(id, plan) {
  return updateOne.run(JSON.stringify(plan), id).changes > 0;
}

/** Case-insensitive match over title, tags and ingredient names. */
export function searchPlans(query, limit = 10) {
  const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  const hits = [];
  for (const row of selectRecentFull.all(500)) {
    const plan = JSON.parse(row.data);
    const haystack = [
      plan.title,
      plan.summary,
      ...(plan.tags || []),
      ...(plan.ingredients || []).map((i) => i.item),
    ]
      .join(' ')
      .toLowerCase();
    if (terms.length === 0 || terms.every((term) => haystack.includes(term))) {
      hits.push({ id: row.id, createdAt: row.created_at, title: plan.title });
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

export function removePlan(id) {
  return deleteOne.run(id).changes > 0;
}

/** Housekeeping so a long-running box does not grow forever. 0 disables. */
export function pruneOlderThanDays(days) {
  if (!days || days <= 0) return 0;
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
  return deleteOld.run(cutoff).changes;
}
