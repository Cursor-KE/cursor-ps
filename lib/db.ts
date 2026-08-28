import "server-only"
import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"

const dbPath = path.join(process.cwd(), "data", "ps.sqlite")

type GlobalDb = typeof globalThis & {
  __psSqlite?: Database.Database
}

function applySchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS extras (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      checked_in INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS selected (
      sort_order INTEGER PRIMARY KEY,
      guest_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      round TEXT NOT NULL,
      slot INTEGER NOT NULL,
      player_a_id TEXT,
      player_a_name TEXT,
      player_b_id TEXT,
      player_b_name TEXT,
      score_a INTEGER,
      score_b INTEGER,
      winner_id TEXT,
      next_match_id TEXT,
      next_slot TEXT
    );
  `)
}

export function sqlitePath(): string {
  return dbPath
}

export function getDb(): Database.Database {
  const globalDb = globalThis as GlobalDb
  if (globalDb.__psSqlite) {
    return globalDb.__psSqlite
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  applySchema(db)
  globalDb.__psSqlite = db
  return db
}
