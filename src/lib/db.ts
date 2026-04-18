import path from "node:path";
import { promises as fs } from "node:fs";
import Database, { type Database as DB } from "better-sqlite3";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "atelier.db");

let instance: DB | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  site_address TEXT NOT NULL,
  total_area_sqm REAL,
  plot_description TEXT NOT NULL,
  floor_plan_url TEXT,
  styles_json TEXT NOT NULL DEFAULT '[]',
  constraints_json TEXT NOT NULL DEFAULT '[]',
  deliverables_json TEXT NOT NULL DEFAULT '[]',
  preferences_notes TEXT,
  admin_notes TEXT,
  samples_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(client_email);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

CREATE TABLE IF NOT EXISTS levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  level_order INTEGER NOT NULL,
  level_name TEXT NOT NULL,
  business_purpose TEXT NOT NULL,
  layout_notes TEXT NOT NULL,
  area_sqm REAL
);

CREATE INDEX IF NOT EXISTS idx_levels_submission ON levels(submission_id, level_order);
`;

export async function getDb(): Promise<DB> {
  if (instance) return instance;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  instance = db;
  return db;
}
