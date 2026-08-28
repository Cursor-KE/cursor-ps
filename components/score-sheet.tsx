"use client"

import { useState, type FormEvent } from "react"
import { matchesInRound, roundLabel } from "@/lib/bracket"
import type { Match, RoundId, Tournament } from "@/lib/types"

const ROUNDS: RoundId[] = ["r16", "qf", "sf", "final"]

type ScoreSheetProps = {
  tournament: Tournament
  onSave: (matchId: string, scoreA: number, scoreB: number) => Promise<void>
  busyId: string | null
  error: string | null
}

function ScoreRow({
  match,
  onSave,
  busy,
}: {
  match: Match
  onSave: (matchId: string, scoreA: number, scoreB: number) => Promise<void>
  busy: boolean
}) {
  const [scoreA, setScoreA] = useState(match.scoreA?.toString() ?? "")
  const [scoreB, setScoreB] = useState(match.scoreB?.toString() ?? "")
  const ready = Boolean(match.playerA && match.playerB)
  const locked = Boolean(match.winnerId)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextA = Number(scoreA)
    const nextB = Number(scoreB)
    void onSave(match.id, nextA, nextB)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-sm border border-line bg-surface px-4 py-3 md:grid-cols-[1fr_auto]"
    >
      <div className="grid gap-2">
        <label className="flex items-center justify-between gap-3">
          <span className={match.winnerId === match.playerA?.id ? "text-accent" : ""}>
            {match.playerA?.name ?? "Waiting for winner"}
          </span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={scoreA}
            onChange={(event) => setScoreA(event.target.value)}
            disabled={!ready || busy}
            className="w-16 rounded-sm border border-line bg-bg px-2 py-1 text-right tabular-nums outline-none focus-visible:border-accent"
            aria-label={`${match.playerA?.name ?? "Player A"} score`}
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className={match.winnerId === match.playerB?.id ? "text-accent" : ""}>
            {match.playerB?.name ?? "Waiting for winner"}
          </span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={scoreB}
            onChange={(event) => setScoreB(event.target.value)}
            disabled={!ready || busy}
            className="w-16 rounded-sm border border-line bg-bg px-2 py-1 text-right tabular-nums outline-none focus-visible:border-accent"
            aria-label={`${match.playerB?.name ?? "Player B"} score`}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={!ready || busy}
        className="self-center rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        {locked ? "Update" : "Lock result"}
      </button>
    </form>
  )
}

export function ScoreSheet({ tournament, onSave, busyId, error }: ScoreSheetProps) {
  return (
    <div className="grid gap-8">
      {error ? (
        <p className="rounded-sm border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {ROUNDS.map((round) => {
        const matches = matchesInRound(round, tournament.matches)
        return (
          <section key={round} className="grid gap-3">
            <h2 className="font-display text-2xl tracking-wide text-accent uppercase">
              {roundLabel(round)}
            </h2>
            <div className="grid gap-3">
              {matches.map((match) => (
                <ScoreRow
                  key={`${match.id}-${match.scoreA}-${match.scoreB}-${match.winnerId}`}
                  match={match}
                  onSave={onSave}
                  busy={busyId === match.id}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
