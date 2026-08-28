"use server"

import { revalidatePath } from "next/cache"
import { applyScore, drawBracket, FIELD_SIZE, guestsById } from "@/lib/bracket"
import { guests } from "@/lib/guests"
import { readTournament, writeTournament } from "@/lib/tournament-store"
import type { Guest, Tournament } from "@/lib/types"

function refreshBoards() {
  revalidatePath("/")
  revalidatePath("/host")
  revalidatePath("/board")
}

function playerPool(extras: Guest[]) {
  return [...guests, ...extras]
}

function selectedGuests(ids: string[], extras: Guest[]) {
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length !== FIELD_SIZE) {
    throw new Error(`Select exactly ${FIELD_SIZE} players`)
  }

  const index = guestsById(playerPool(extras))
  return uniqueIds.map((id) => {
    const guest = index.get(id)
    if (!guest) {
      throw new Error("A selected guest is not on the list")
    }
    return guest
  })
}

export async function addWalkIn(name: string, email: string): Promise<Guest> {
  const trimmedName = name.trim()
  if (trimmedName.length < 2) {
    throw new Error("Add a name")
  }

  const trimmedEmail = email.trim().toLowerCase()
  const guest: Guest = {
    id: `walk-${crypto.randomUUID()}`,
    name: trimmedName,
    email: trimmedEmail,
    checkedIn: true,
  }

  const current = await readTournament()
  const selectedIds =
    current.selectedIds.includes(guest.id) || current.selectedIds.length >= FIELD_SIZE
      ? current.selectedIds
      : [...current.selectedIds, guest.id]

  await writeTournament({
    ...current,
    extras: [...current.extras, guest],
    selectedIds,
  })
  refreshBoards()
  return guest
}

export async function saveSelection(guestIds: string[]): Promise<Tournament> {
  const current = await readTournament()
  if (current.status !== "picking") {
    return current
  }

  const uniqueIds = [...new Set(guestIds)].slice(0, FIELD_SIZE)
  const saved = await writeTournament({
    ...current,
    selectedIds: uniqueIds,
  })
  refreshBoards()
  return saved
}

export async function lockAndDraw(guestIds: string[]): Promise<Tournament> {
  const current = await readTournament()
  const tournament = drawBracket(selectedGuests(guestIds, current.extras))
  const saved = await writeTournament({
    ...tournament,
    extras: current.extras,
  })
  refreshBoards()
  return saved
}

export async function redrawBracket(): Promise<Tournament> {
  const current = await readTournament()
  if (current.status === "picking") {
    throw new Error("Lock 16 players before drawing")
  }
  if (current.matches.some((match) => match.winnerId)) {
    throw new Error("Scores are already in — reset the night to redraw")
  }

  const tournament = drawBracket(selectedGuests(current.selectedIds, current.extras))
  const saved = await writeTournament({
    ...tournament,
    extras: current.extras,
  })
  refreshBoards()
  return saved
}

export async function saveScore(
  matchId: string,
  scoreA: number,
  scoreB: number
): Promise<Tournament> {
  const current = await readTournament()
  const tournament = applyScore(current, matchId, scoreA, scoreB)
  const saved = await writeTournament(tournament)
  refreshBoards()
  return saved
}

export async function resetNight(): Promise<Tournament> {
  const current = await readTournament()
  const saved = await writeTournament({
    status: "picking",
    selectedIds: [],
    extras: current.extras,
    matches: [],
    updatedAt: new Date().toISOString(),
  })
  refreshBoards()
  return saved
}
