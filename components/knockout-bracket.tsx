import type { ReactNode } from "react"
import {
  championOf,
  currentMatch,
  displayMatches,
  fieldPlayers,
  matchesInRound,
} from "@/lib/bracket"
import { MatchTie } from "@/components/match-tie"
import type { Guest, Tournament } from "@/lib/types"

type KnockoutBracketProps = {
  tournament: Tournament
  pool: Guest[]
}

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = []
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner
    const angle = (Math.PI / 5) * index - Math.PI / 2
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`)
  }
  return points.join(" ")
}

function StarRing() {
  const stars = 10
  return (
    <svg className="ucl-star-ring" viewBox="0 0 200 200" aria-hidden>
      <defs>
        <linearGradient id="ucl-ring-gold" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff4c2" />
          <stop offset="45%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#8a6a14" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="78" fill="none" stroke="url(#ucl-ring-gold)" strokeWidth="1.4" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(212,175,55,0.28)" strokeWidth="0.8" />
      {Array.from({ length: stars }, (_, index) => {
        const angle = (index / stars) * Math.PI * 2 - Math.PI / 2
        const x = 100 + Math.cos(angle) * 78
        const y = 100 + Math.sin(angle) * 78
        return <polygon key={index} points={starPoints(x, y, 7, 3)} fill="url(#ucl-ring-gold)" />
      })}
    </svg>
  )
}

function TrophyMark() {
  return (
    <svg className="ucl-trophy" viewBox="0 0 80 96" aria-hidden>
      <defs>
        <linearGradient id="ucl-cup" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff4c2" />
          <stop offset="40%" stopColor="#e6c65a" />
          <stop offset="100%" stopColor="#9a7418" />
        </linearGradient>
      </defs>
      <path
        d="M18 14h44v10c0 14-8 24-22 27C26 48 18 38 18 24V14z"
        fill="url(#ucl-cup)"
      />
      <path
        d="M18 18H8c0 12 6 18 14 20"
        fill="none"
        stroke="url(#ucl-cup)"
        strokeWidth="3.2"
      />
      <path
        d="M62 18h10c0 12-6 18-14 20"
        fill="none"
        stroke="url(#ucl-cup)"
        strokeWidth="3.2"
      />
      <path d="M40 51v12" stroke="url(#ucl-cup)" strokeWidth="3.2" />
      <rect x="28" y="62" width="24" height="5" rx="1" fill="url(#ucl-cup)" />
      <rect x="22" y="76" width="36" height="8" rx="1.5" fill="url(#ucl-cup)" />
    </svg>
  )
}

function Column({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <section className="ucl-col">
      <h3 className="ucl-col-label">{label}</h3>
      <div className="ucl-col-stack">{children}</div>
    </section>
  )
}

function Rails({
  forks,
  labels,
  flip = false,
}: {
  forks: number
  labels: string[]
  flip?: boolean
}) {
  return (
    <div className={`ucl-rails ${flip ? "is-flip" : ""}`} aria-hidden>
      {Array.from({ length: forks }, (_, index) => (
        <div key={index} className="ucl-elbow">
          <span className="ucl-elbow-label">{labels[index]}</span>
        </div>
      ))}
    </div>
  )
}

export function KnockoutBracket({ tournament, pool }: KnockoutBracketProps) {
  const matches = displayMatches(tournament, pool)
  const shown = { ...tournament, matches }
  const live = tournament.matches.length > 0 ? currentMatch(shown) : null
  const champion = championOf(shown)
  const field = fieldPlayers(tournament, pool)
  const seeds = new Map(field.map((player, index) => [player.id, index + 1]))
  const r16 = matchesInRound("r16", matches)
  const qf = matchesInRound("qf", matches)
  const sf = matchesInRound("sf", matches)
  const finalMatch = matchesInRound("final", matches)[0]

  if (!finalMatch) {
    return (
      <p className="ucl-empty">
        Lock 16 players on the host desk to draw the knockout tree.
      </p>
    )
  }

  return (
    <div className="ucl-bracket-scroll">
      <div className="ucl-bracket">
        <div className="ucl-tree">
          <Column label="R16">
            {r16.slice(0, 4).map((match) => (
              <MatchTie
                key={match.id}
                match={match}
                active={live?.id === match.id}
                compact
                side="left"
                seeds={seeds}
              />
            ))}
          </Column>
          <Rails forks={2} labels={["QF-1", "QF-2"]} />
          <Column label="QF">
            {qf.slice(0, 2).map((match) => (
              <MatchTie
                key={match.id}
                match={match}
                active={live?.id === match.id}
                compact
                side="left"
                seeds={seeds}
              />
            ))}
          </Column>
          <Rails forks={1} labels={["SF-1"]} />
          <Column label="SF">
            {sf.slice(0, 1).map((match) => (
              <MatchTie
                key={match.id}
                match={match}
                active={live?.id === match.id}
                compact
                side="left"
                seeds={seeds}
              />
            ))}
          </Column>
        </div>

        <section className="ucl-final">
          <p className="ucl-road">Road to</p>
          <h2 className="ucl-city">Nairobi</h2>
          <div className="ucl-final-halo">
            <StarRing />
            <TrophyMark />
          </div>
          <p className="ucl-col-label">Final</p>
          <MatchTie
            match={finalMatch}
            active={live?.id === finalMatch.id}
            side="left"
            seeds={seeds}
          />
          <p className={`ucl-champion ${champion ? "is-crowned" : ""}`}>
            {champion ? champion.name : "Champion TBD"}
          </p>
          <p className="ucl-foot">Winners advance · no draws</p>
        </section>

        <div className="ucl-tree is-flip">
          <Column label="SF">
            {sf.slice(1, 2).map((match) => (
              <MatchTie
                key={match.id}
                match={match}
                active={live?.id === match.id}
                compact
                side="right"
                seeds={seeds}
              />
            ))}
          </Column>
          <Rails forks={1} labels={["SF-2"]} flip />
          <Column label="QF">
            {qf.slice(2, 4).map((match) => (
              <MatchTie
                key={match.id}
                match={match}
                active={live?.id === match.id}
                compact
                side="right"
                seeds={seeds}
              />
            ))}
          </Column>
          <Rails forks={2} labels={["QF-3", "QF-4"]} flip />
          <Column label="R16">
            {r16.slice(4, 8).map((match) => (
              <MatchTie
                key={match.id}
                match={match}
                active={live?.id === match.id}
                compact
                side="right"
                seeds={seeds}
              />
            ))}
          </Column>
        </div>
      </div>
    </div>
  )
}
