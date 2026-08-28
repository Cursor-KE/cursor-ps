"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { addWalkIn, lockAndDraw, redrawBracket, resetNight, saveScore, saveSelection } from "@/app/actions/tournament"
import { NightHeader } from "@/components/night-header"
import { PlayerPicker } from "@/components/player-picker"
import { ScoreSheet } from "@/components/score-sheet"
import { FIELD_SIZE } from "@/lib/bracket"
import type { Guest, Tournament } from "@/lib/types"

type HostDeskProps = {
  guests: Guest[]
  initialTournament: Tournament
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return "Something went wrong"
}

export function HostDesk({ guests, initialTournament }: HostDeskProps) {
  const router = useRouter()
  const [tournament, setTournament] = useState(initialTournament)
  const [selectedIds, setSelectedIds] = useState(initialTournament.selectedIds)
  const [extras, setExtras] = useState(initialTournament.extras ?? [])
  const [query, setQuery] = useState("")
  const [checkedOnly, setCheckedOnly] = useState(true)
  const [walkInName, setWalkInName] = useState("")
  const [walkInEmail, setWalkInEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const pool = useMemo(() => [...extras, ...guests], [extras, guests])

  function commit(next: Tournament) {
    setTournament(next)
    router.refresh()
  }

  const visibleGuests = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return pool.filter((guest) => {
      if (checkedOnly && !guest.checkedIn) {
        return false
      }
      if (!needle) {
        return true
      }
      return (
        guest.name.toLowerCase().includes(needle) || guest.email.toLowerCase().includes(needle)
      )
    })
  }, [checkedOnly, pool, query])

  function handleToggle(guestId: string) {
    const next = selectedIds.includes(guestId)
      ? selectedIds.filter((id) => id !== guestId)
      : selectedIds.length >= FIELD_SIZE
        ? selectedIds
        : [...selectedIds, guestId]

    setSelectedIds(next)
    if (next !== selectedIds) {
      void saveSelection(next)
    }
  }

  async function handleAddWalkIn() {
    setError(null)
    setBusyId("walk-in")
    try {
      const guest = await addWalkIn(walkInName, walkInEmail)
      setExtras((current) => [guest, ...current])
      setSelectedIds((current) => {
        if (current.includes(guest.id) || current.length >= FIELD_SIZE) {
          return current
        }
        return [...current, guest.id]
      })
      setWalkInName("")
      setWalkInEmail("")
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  async function handleDraw() {
    setError(null)
    setBusyId("draw")
    try {
      const next = await lockAndDraw(selectedIds)
      commit(next)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  async function handleRedraw() {
    setError(null)
    setBusyId("redraw")
    try {
      const next = await redrawBracket()
      commit(next)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  async function handleReset() {
    setError(null)
    setBusyId("reset")
    try {
      const next = await resetNight()
      setSelectedIds([])
      commit(next)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  async function handleSave(matchId: string, scoreA: number, scoreB: number) {
    setError(null)
    setBusyId(matchId)
    try {
      const next = await saveScore(matchId, scoreA, scoreB)
      commit(next)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  const picking = tournament.status === "picking"

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <NightHeader actionHref="/" actionLabel="Open room board" />

      {picking ? (
        <>
          <section className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-muted">Tap 16 players, then lock the field.</p>
              <p className="font-display text-4xl text-accent">
                {selectedIds.length} / {FIELD_SIZE}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleDraw()}
              disabled={selectedIds.length !== FIELD_SIZE || busyId !== null}
              className="rounded-sm bg-accent px-5 py-3 font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lock & draw 8v8
            </button>
          </section>
          {error ? (
            <p className="rounded-sm border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <PlayerPicker
            guests={visibleGuests}
            pool={pool}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            query={query}
            onQueryChange={setQuery}
            checkedOnly={checkedOnly}
            onCheckedOnlyChange={setCheckedOnly}
            walkInName={walkInName}
            walkInEmail={walkInEmail}
            onWalkInNameChange={setWalkInName}
            onWalkInEmailChange={setWalkInEmail}
            onAddWalkIn={() => void handleAddWalkIn()}
            adding={busyId === "walk-in"}
          />
        </>
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted">
              Enter scores. Winners move on. No draws — use extra time or pens.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleRedraw()}
                disabled={busyId !== null}
                className="rounded-sm border border-ink px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent"
              >
                Redraw same 16
              </button>
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={busyId !== null}
                className="rounded-sm border border-danger/50 px-4 py-2 text-sm font-semibold text-danger"
              >
                Reset night
              </button>
            </div>
          </section>
          <ScoreSheet
            tournament={tournament}
            onSave={handleSave}
            busyId={busyId}
            error={error}
          />
        </>
      )}
    </main>
  )
}
