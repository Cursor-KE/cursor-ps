"use client"

import { useEffect, useMemo, useState } from "react"
import { NightHeader } from "@/components/night-header"
import { KnockoutBracket } from "@/components/knockout-bracket"
import { MatchTie } from "@/components/match-tie"
import { championOf, currentMatch, displayMatches, fieldPlayers, roundLabel } from "@/lib/bracket"
import type { Guest, Tournament } from "@/lib/types"

type RoomBoardProps = {
  initialTournament: Tournament
  guests: Guest[]
}

export function RoomBoard({ initialTournament, guests }: RoomBoardProps) {
  const [tournament, setTournament] = useState(initialTournament)

  useEffect(() => {
    let active = true

    async function refresh() {
      try {
        const response = await fetch("/api/tournament", { cache: "no-store" })
        if (!response.ok) {
          return
        }
        const next = (await response.json()) as Tournament
        if (active) {
          setTournament(next)
        }
      } catch {
        // Keep the last good board up if the host laptop blips.
      }
    }

    const timer = window.setInterval(() => {
      void refresh()
    }, 2000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const pool = useMemo(() => [...tournament.extras, ...guests], [guests, tournament.extras])
  const shown = useMemo(
    () => ({ ...tournament, matches: displayMatches(tournament, pool) }),
    [pool, tournament]
  )
  const live = tournament.matches.length > 0 ? currentMatch(shown) : null
  const champion = championOf(shown)
  const field = fieldPlayers(tournament, pool)

  return (
    <main className="ucl-night">
      <div className="ucl-stadium">
        <NightHeader actionHref="/host" actionLabel="Host desk" variant="ucl" />

        <section className="ucl-ticker">
          <p className="ucl-headline">
            {champion
              ? `${champion.name} lifts the night`
              : live
                ? `Now playing · ${roundLabel(live.round)}`
                : field.length === 16
                  ? "Field set · lock the draw"
                  : field.length > 0
                    ? `${field.length} / 16 on the wall`
                    : "Waiting for the field"}
          </p>
          {live ? <MatchTie match={live} active /> : null}
        </section>

        <KnockoutBracket tournament={tournament} pool={pool} />
      </div>
    </main>
  )
}
