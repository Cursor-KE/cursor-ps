import type { Match, Player } from "@/lib/types"
import { roundShort } from "@/lib/bracket"

type MatchTieProps = {
  match: Match
  active?: boolean
  compact?: boolean
  side?: "left" | "right"
  seeds?: Map<string, number>
}

function playerMark(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return "?"
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  const first = parts[0][0] ?? ""
  const last = parts[parts.length - 1]?.[0] ?? ""
  return `${first}${last}`.toUpperCase()
}

function PlayerBar({
  player,
  score,
  isWinner,
  waiting,
  seed,
  side,
}: {
  player: Player | null
  score: number | null
  isWinner: boolean
  waiting: boolean
  seed?: number
  side: "left" | "right"
}) {
  const name = player?.name ?? "TBD"
  const seedMark = seed ?? "–"

  return (
    <div
      className={`ucl-slot ${isWinner ? "is-winner" : ""} ${waiting ? "is-waiting" : ""}`}
    >
      {side === "left" ? <span className="ucl-seed">{seedMark}</span> : null}
      <div className="ucl-bar">
        <span className="ucl-mark" aria-hidden>
          {waiting ? "·" : playerMark(name)}
        </span>
        <span className="ucl-bar-name">{name}</span>
        <span className="ucl-bar-score">{score === null ? "" : score}</span>
      </div>
      {side === "right" ? <span className="ucl-seed">{seedMark}</span> : null}
    </div>
  )
}

export function MatchTie({
  match,
  active = false,
  compact = false,
  side = "left",
  seeds,
}: MatchTieProps) {
  const waitingA = !match.playerA
  const waitingB = !match.playerB

  return (
    <article
      className={`ucl-tie ${active ? "is-live" : ""} ${compact ? "is-compact" : ""}`}
    >
      <p className="ucl-tie-label">
        {roundShort(match.round)}-{match.slot + 1}
        {active ? <span className="ucl-now">Now</span> : null}
      </p>
      <PlayerBar
        player={match.playerA}
        score={match.scoreA}
        isWinner={match.winnerId === match.playerA?.id}
        waiting={waitingA}
        seed={match.playerA ? seeds?.get(match.playerA.id) : undefined}
        side={side}
      />
      <PlayerBar
        player={match.playerB}
        score={match.scoreB}
        isWinner={match.winnerId === match.playerB?.id}
        waiting={waitingB}
        seed={match.playerB ? seeds?.get(match.playerB.id) : undefined}
        side={side}
      />
    </article>
  )
}
