import "server-only"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { get, put } from "@vercel/blob"
import { emptyTournament } from "@/lib/bracket"
import { getDb } from "@/lib/db"
import seedData from "@/data/tournament-seed.json"
import type { Guest, Match, MatchSlot, Player, RoundId, Tournament, TournamentStatus } from "@/lib/types"

const jsonStorePath = path.join(process.cwd(), "data", "tournament.json")
const blobPath = "tournament.json"

type MetaRow = {
  status: string
  updated_at: string
}

type ExtraRow = {
  id: string
  name: string
  email: string
  checked_in: number
}

type SelectedRow = {
  guest_id: string
}

type MatchRow = {
  id: string
  round: string
  slot: number
  player_a_id: string | null
  player_a_name: string | null
  player_b_id: string | null
  player_b_name: string | null
  score_a: number | null
  score_b: number | null
  winner_id: string | null
  next_match_id: string | null
  next_slot: string | null
}

function isTournament(value: unknown): value is Tournament {
  if (!value || typeof value !== "object") {
    return false
  }

  const record = value as Partial<Tournament>
  return (
    (record.status === "picking" || record.status === "live" || record.status === "complete") &&
    Array.isArray(record.selectedIds) &&
    Array.isArray(record.matches)
  )
}

function isStatus(value: string): value is TournamentStatus {
  return value === "picking" || value === "live" || value === "complete"
}

function isRound(value: string): value is RoundId {
  return value === "r16" || value === "qf" || value === "sf" || value === "final"
}

function isSlot(value: string | null): value is MatchSlot {
  return value === "A" || value === "B"
}

function playerFrom(id: string | null, name: string | null): Player | null {
  if (!id || !name) {
    return null
  }
  return { id, name }
}

function toGuest(row: ExtraRow): Guest {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    checkedIn: Boolean(row.checked_in),
  }
}

function toMatch(row: MatchRow): Match {
  if (!isRound(row.round)) {
    throw new Error(`Unknown match round: ${row.round}`)
  }

  return {
    id: row.id,
    round: row.round,
    slot: row.slot,
    playerA: playerFrom(row.player_a_id, row.player_a_name),
    playerB: playerFrom(row.player_b_id, row.player_b_name),
    scoreA: row.score_a,
    scoreB: row.score_b,
    winnerId: row.winner_id,
    nextMatchId: row.next_match_id,
    nextSlot: isSlot(row.next_slot) ? row.next_slot : null,
  }
}

function useRemoteStore(): boolean {
  return Boolean(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN)
}

function seedTournament(): Tournament {
  if (!isTournament(seedData)) {
    return emptyTournament()
  }

  return {
    ...seedData,
    extras: seedData.extras ?? [],
  }
}

function stamp(tournament: Tournament): Tournament {
  return {
    ...tournament,
    extras: tournament.extras ?? [],
    updatedAt: new Date().toISOString(),
  }
}

async function persistBlob(tournament: Tournament): Promise<Tournament> {
  const next = stamp(tournament)
  await put(blobPath, JSON.stringify(next), {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  })
  return next
}

async function readFromBlob(): Promise<Tournament> {
  const result = await get(blobPath, { access: "private", useCache: false })
  if (!result) {
    return persistBlob(seedTournament())
  }

  switch (result.statusCode) {
    case 200: {
      const parsed: unknown = JSON.parse(await new Response(result.stream).text())
      if (!isTournament(parsed)) {
        return persistBlob(seedTournament())
      }
      return {
        ...parsed,
        extras: parsed.extras ?? [],
      }
    }
    case 304:
      return seedTournament()
    default: {
      const _exhaustive: never = result
      return _exhaustive
    }
  }
}

function readFromDb(): Tournament | null {
  const db = getDb()
  const meta = db.prepare("SELECT status, updated_at FROM meta WHERE id = 1").get() as MetaRow | undefined
  if (!meta || !isStatus(meta.status)) {
    return null
  }

  const extras = db
    .prepare("SELECT id, name, email, checked_in FROM extras ORDER BY sort_order ASC")
    .all() as ExtraRow[]
  const selected = db.prepare("SELECT guest_id FROM selected ORDER BY sort_order ASC").all() as SelectedRow[]
  const matches = db.prepare("SELECT * FROM matches ORDER BY round ASC, slot ASC").all() as MatchRow[]

  return {
    status: meta.status,
    selectedIds: selected.map((row) => row.guest_id),
    extras: extras.map(toGuest),
    matches: matches.map(toMatch),
    updatedAt: meta.updated_at,
  }
}

function persistSqlite(tournament: Tournament): Tournament {
  const next = stamp(tournament)
  const db = getDb()
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
    })

    db.prepare("DELETE FROM extras").run()
    const insertExtra = db.prepare(`
      INSERT INTO extras (id, name, email, checked_in, sort_order)
      VALUES (@id, @name, @email, @checkedIn, @sortOrder)
    `)
    next.extras.forEach((guest, index) => {
      insertExtra.run({
        id: guest.id,
        name: guest.name,
        email: guest.email,
        checkedIn: guest.checkedIn ? 1 : 0,
        sortOrder: index,
      })
    })

    db.prepare("DELETE FROM selected").run()
    const insertSelected = db.prepare("INSERT INTO selected (sort_order, guest_id) VALUES (@sortOrder, @guestId)")
    next.selectedIds.forEach((guestId, index) => {
      insertSelected.run({ sortOrder: index, guestId })
    })

    db.prepare("DELETE FROM matches").run()
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
    `)
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
      })
    })
  })

  write()
  return next
}

function withSeededSelection(tournament: Tournament): Tournament {
  if (tournament.selectedIds.length > 0 || tournament.extras.length === 0) {
    return tournament
  }

  return {
    ...tournament,
    selectedIds: tournament.extras.map((guest) => guest.id),
  }
}

async function migrateFromJson(): Promise<Tournament> {
  try {
    const raw = await readFile(jsonStorePath, "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!isTournament(parsed)) {
      return persistSqlite(emptyTournament())
    }

    return persistSqlite(
      withSeededSelection({
        ...parsed,
        extras: Array.isArray(parsed.extras) ? parsed.extras : [],
      })
    )
  } catch {
    return persistSqlite(emptyTournament())
  }
}

export async function readTournament(): Promise<Tournament> {
  if (useRemoteStore()) {
    return readFromBlob()
  }

  const existing = readFromDb()
  if (existing) {
    return existing
  }
  return migrateFromJson()
}

export async function writeTournament(tournament: Tournament): Promise<Tournament> {
  if (useRemoteStore()) {
    return persistBlob(tournament)
  }
  return persistSqlite(tournament)
}
