import type { Guest, Match, Player, RoundId, Tournament } from "@/lib/types"

export const FIELD_SIZE = 16

export function emptyTournament(): Tournament {
  return {
    status: "picking",
    selectedIds: [],
    extras: [],
    matches: [],
    updatedAt: new Date(0).toISOString(),
  }
}

export function roundLabel(round: RoundId): string {
  switch (round) {
    case "r16":
      return "Round of 16"
    case "qf":
      return "Quarter-finals"
    case "sf":
      return "Semi-finals"
    case "final":
      return "Final"
    default: {
      const _exhaustive: never = round
      return _exhaustive
    }
  }
}

export function roundShort(round: RoundId): string {
  switch (round) {
    case "r16":
      return "R16"
    case "qf":
      return "QF"
    case "sf":
      return "SF"
    case "final":
      return "Final"
    default: {
      const _exhaustive: never = round
      return _exhaustive
    }
  }
}

export function matchesInRound(round: RoundId, matches: Match[]): Match[] {
  return matches
    .filter((match) => match.round === round)
    .sort((a, b) => a.slot - b.slot)
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[swap] as T
    next[swap] = current as T
  }
  return next
}

function toPlayer(guest: Guest): Player {
  return { id: guest.id, name: guest.name }
}

function createSkeleton(): Match[] {
  const finalMatch: Match = {
    id: "final-0",
    round: "final",
    slot: 0,
    playerA: null,
    playerB: null,
    scoreA: null,
    scoreB: null,
    winnerId: null,
    nextMatchId: null,
    nextSlot: null,
  }

  const semis: Match[] = [0, 1].map((slot) => ({
    id: `sf-${slot}`,
    round: "sf",
    slot,
    playerA: null,
    playerB: null,
    scoreA: null,
    scoreB: null,
    winnerId: null,
    nextMatchId: "final-0",
    nextSlot: slot === 0 ? "A" : "B",
  }))

  const quarters: Match[] = [0, 1, 2, 3].map((slot) => ({
    id: `qf-${slot}`,
    round: "qf",
    slot,
    playerA: null,
    playerB: null,
    scoreA: null,
    scoreB: null,
    winnerId: null,
    nextMatchId: `sf-${Math.floor(slot / 2)}`,
    nextSlot: slot % 2 === 0 ? "A" : "B",
  }))

  const lastSixteen: Match[] = [0, 1, 2, 3, 4, 5, 6, 7].map((slot) => ({
    id: `r16-${slot}`,
    round: "r16",
    slot,
    playerA: null,
    playerB: null,
    scoreA: null,
    scoreB: null,
    winnerId: null,
    nextMatchId: `qf-${Math.floor(slot / 2)}`,
    nextSlot: slot % 2 === 0 ? "A" : "B",
  }))

  return [...lastSixteen, ...quarters, ...semis, finalMatch]
}

export function drawBracket(guests: Guest[]): Tournament {
  if (guests.length !== FIELD_SIZE) {
    throw new Error(`Need exactly ${FIELD_SIZE} players to draw`)
  }

  const players = shuffle(guests.map(toPlayer))
  const matches = createSkeleton()

  matchesInRound("r16", matches).forEach((match, index) => {
    match.playerA = players[index * 2] ?? null
    match.playerB = players[index * 2 + 1] ?? null
  })

  return {
    status: "live",
    selectedIds: guests.map((guest) => guest.id),
    extras: [],
    matches,
    updatedAt: new Date().toISOString(),
  }
}

function playerById(match: Match, playerId: string): Player | null {
  if (match.playerA?.id === playerId) {
    return match.playerA
  }
  if (match.playerB?.id === playerId) {
    return match.playerB
  }
  return null
}

function laterMatchHasScore(matches: Match[], match: Match): boolean {
  if (!match.nextMatchId) {
    return false
  }

  const next = matches.find((item) => item.id === match.nextMatchId)
  if (!next) {
    return false
  }

  return next.scoreA !== null || next.scoreB !== null || laterMatchHasScore(matches, next)
}

export function applyScore(
  tournament: Tournament,
  matchId: string,
  scoreA: number,
  scoreB: number
): Tournament {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
    throw new Error("Scores must be whole numbers of 0 or more")
  }
  if (scoreA === scoreB) {
    throw new Error("No draws — play extra time or pens, then enter the final score")
  }

  const matches = tournament.matches.map((match) => ({ ...match }))
  const match = matches.find((item) => item.id === matchId)

  if (!match) {
    throw new Error("Match not found")
  }
  if (!match.playerA || !match.playerB) {
    throw new Error("This tie is waiting for a player")
  }
  if (laterMatchHasScore(matches, match)) {
    throw new Error("A later match is already locked — reset if you need to change this")
  }

  const winner = scoreA > scoreB ? match.playerA : match.playerB
  match.scoreA = scoreA
  match.scoreB = scoreB
  match.winnerId = winner.id

  if (match.nextMatchId && match.nextSlot) {
    const next = matches.find((item) => item.id === match.nextMatchId)
    if (!next) {
      throw new Error("Next match is missing")
    }

    if (match.nextSlot === "A") {
      next.playerA = winner
    } else {
      next.playerB = winner
    }
  }

  const finalMatch = matches.find((item) => item.id === "final-0")
  const isComplete = Boolean(finalMatch?.winnerId)

  return {
    ...tournament,
    status: isComplete ? "complete" : "live",
    matches,
    updatedAt: new Date().toISOString(),
  }
}

export function championOf(tournament: Tournament): Player | null {
  const finalMatch = tournament.matches.find((match) => match.id === "final-0")
  if (!finalMatch?.winnerId) {
    return null
  }
  return playerById(finalMatch, finalMatch.winnerId)
}

export function currentMatch(tournament: Tournament): Match | null {
  const order: RoundId[] = ["r16", "qf", "sf", "final"]
  for (const round of order) {
    const open = matchesInRound(round, tournament.matches).find((match) => {
      return Boolean(match.playerA && match.playerB && !match.winnerId)
    })
    if (open) {
      return open
    }
  }
  return null
}

export function guestsById(guests: Guest[]): Map<string, Guest> {
  return new Map(guests.map((guest) => [guest.id, guest]))
}

export function fieldPlayers(tournament: Tournament, pool: Guest[]): Player[] {
  const index = guestsById(pool)
  return tournament.selectedIds
    .map((id) => index.get(id))
    .filter((guest): guest is Guest => Boolean(guest))
    .map(toPlayer)
}

export function displayMatches(tournament: Tournament, pool: Guest[]): Match[] {
  if (tournament.matches.length > 0) {
    return tournament.matches
  }

  const players = fieldPlayers(tournament, pool)
  if (players.length === 0) {
    return []
  }

  const matches = createSkeleton()
  matchesInRound("r16", matches).forEach((match, index) => {
    match.playerA = players[index * 2] ?? null
    match.playerB = players[index * 2 + 1] ?? null
  })
  return matches
}
