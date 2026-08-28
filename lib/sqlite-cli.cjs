"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const dbPath = path.join(process.cwd(), "data", "ps.sqlite");
const jsonStorePath = path.join(process.cwd(), "data", "tournament.json");

function emptyTournament() {
  return {
    status: "picking",
    selectedIds: [],
    extras: [],
    matches: [],
    updatedAt: new Date(0).toISOString(),
  };
}

function applySchema(db) {
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
  `);
}

function openDb() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  applySchema(db);
  return db;
}

function isTournament(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value.status === "picking" || value.status === "live" || value.status === "complete") &&
    Array.isArray(value.selectedIds) &&
    Array.isArray(value.matches)
  );
}

function playerFrom(id, name) {
  if (!id || !name) {
    return null;
  }
  return { id, name };
}

function persist(db, tournament) {
  const next = {
    ...tournament,
    extras: Array.isArray(tournament.extras) ? tournament.extras : [],
    selectedIds: Array.isArray(tournament.selectedIds) ? tournament.selectedIds : [],
    matches: Array.isArray(tournament.matches) ? tournament.matches : [],
    updatedAt: new Date().toISOString(),
  };

  const write = db.transaction(() => {
    db.prepare(
      `
        INSERT INTO meta (id, status, updated_at)
        VALUES (1, @status, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          updated_at = excluded.updated_at
      `
    ).run({
      status: next.status,
      updatedAt: next.updatedAt,
    });

    db.prepare("DELETE FROM extras").run();
    const insertExtra = db.prepare(`
      INSERT INTO extras (id, name, email, checked_in, sort_order)
      VALUES (@id, @name, @email, @checkedIn, @sortOrder)
    `);
    next.extras.forEach((guest, index) => {
      insertExtra.run({
        id: guest.id,
        name: guest.name,
        email: guest.email,
        checkedIn: guest.checkedIn ? 1 : 0,
        sortOrder: index,
      });
    });

    db.prepare("DELETE FROM selected").run();
    const insertSelected = db.prepare(
      "INSERT INTO selected (sort_order, guest_id) VALUES (@sortOrder, @guestId)"
    );
    next.selectedIds.forEach((guestId, index) => {
      insertSelected.run({ sortOrder: index, guestId });
    });

    db.prepare("DELETE FROM matches").run();
    const insertMatch = db.prepare(`
      INSERT INTO matches (
        id, round, slot,
        player_a_id, player_a_name, player_b_id, player_b_name,
        score_a, score_b, winner_id, next_match_id, next_slot
      ) VALUES (
        @id, @round, @slot,
        @playerAId, @playerAName, @playerBId, @playerBName,
        @scoreA, @scoreB, @winnerId, @nextMatchId, @nextSlot
      )
    `);
    next.matches.forEach((match) => {
      insertMatch.run({
        id: match.id,
        round: match.round,
        slot: match.slot,
        playerAId: match.playerA?.id ?? null,
        playerAName: match.playerA?.name ?? null,
        playerBId: match.playerB?.id ?? null,
        playerBName: match.playerB?.name ?? null,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        winnerId: match.winnerId,
        nextMatchId: match.nextMatchId,
        nextSlot: match.nextSlot,
      });
    });
  });

  write();
  return next;
}

function readFromDb(db) {
  const meta = db.prepare("SELECT status, updated_at FROM meta WHERE id = 1").get();
  if (!meta) {
    return null;
  }

  const extras = db
    .prepare("SELECT id, name, email, checked_in FROM extras ORDER BY sort_order ASC")
    .all();
  const selected = db.prepare("SELECT guest_id FROM selected ORDER BY sort_order ASC").all();
  const matches = db.prepare("SELECT * FROM matches ORDER BY round ASC, slot ASC").all();

  return {
    status: meta.status,
    selectedIds: selected.map((row) => row.guest_id),
    extras: extras.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      checkedIn: Boolean(row.checked_in),
    })),
    matches: matches.map((row) => ({
      id: row.id,
      round: row.round,
      slot: row.slot,
      playerA: playerFrom(row.player_a_id, row.player_a_name),
      playerB: playerFrom(row.player_b_id, row.player_b_name),
      scoreA: row.score_a,
      scoreB: row.score_b,
      winnerId: row.winner_id,
      nextMatchId: row.next_match_id,
      nextSlot: row.next_slot === "A" || row.next_slot === "B" ? row.next_slot : null,
    })),
    updatedAt: meta.updated_at,
  };
}

function withSeededSelection(tournament) {
  if (tournament.selectedIds.length > 0 || tournament.extras.length === 0) {
    return tournament;
  }

  return {
    ...tournament,
    selectedIds: tournament.extras.map((guest) => guest.id),
  };
}

function migrateFromJson(db) {
  try {
    const raw = fs.readFileSync(jsonStorePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!isTournament(parsed)) {
      return persist(db, emptyTournament());
    }

    return persist(
      db,
      withSeededSelection({
        ...parsed,
        extras: Array.isArray(parsed.extras) ? parsed.extras : [],
      })
    );
  } catch {
    return persist(db, emptyTournament());
  }
}

function readTournament() {
  const db = openDb();
  try {
    return readFromDb(db) ?? migrateFromJson(db);
  } finally {
    db.close();
  }
}

function writeTournament(tournament) {
  const db = openDb();
  try {
    return persist(db, tournament);
  } finally {
    db.close();
  }
}

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

const command = process.argv[2];

try {
  if (command === "read") {
    process.stdout.write(`${JSON.stringify(readTournament())}\n`);
  } else if (command === "write") {
    const parsed = JSON.parse(readStdin());
    process.stdout.write(`${JSON.stringify(writeTournament(parsed))}\n`);
  } else {
    process.stderr.write("usage: sqlite-cli.cjs read|write\n");
    process.exit(1);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
