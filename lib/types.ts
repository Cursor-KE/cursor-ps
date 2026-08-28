export type Guest = {
  id: string
  name: string
  email: string
  checkedIn: boolean
}

export type Player = {
  id: string
  name: string
}

export type RoundId = "r16" | "qf" | "sf" | "final"

export type MatchSlot = "A" | "B"

export type Match = {
  id: string
  round: RoundId
  slot: number
  playerA: Player | null
  playerB: Player | null
  scoreA: number | null
  scoreB: number | null
  winnerId: string | null
  nextMatchId: string | null
  nextSlot: MatchSlot | null
}

export type TournamentStatus = "picking" | "live" | "complete"

export type Tournament = {
  status: TournamentStatus
  selectedIds: string[]
  extras: Guest[]
  matches: Match[]
  updatedAt: string
}
