"use client"

import { FIELD_SIZE } from "@/lib/bracket"
import type { Guest } from "@/lib/types"

type PlayerPickerProps = {
  guests: Guest[]
  pool: Guest[]
  selectedIds: string[]
  onToggle: (guestId: string) => void
  query: string
  onQueryChange: (value: string) => void
  checkedOnly: boolean
  onCheckedOnlyChange: (value: boolean) => void
  walkInName: string
  walkInEmail: string
  onWalkInNameChange: (value: string) => void
  onWalkInEmailChange: (value: string) => void
  onAddWalkIn: () => void
  adding: boolean
}

export function PlayerPicker({
  guests,
  pool,
  selectedIds,
  onToggle,
  query,
  onQueryChange,
  checkedOnly,
  onCheckedOnlyChange,
  walkInName,
  walkInEmail,
  onWalkInNameChange,
  onWalkInEmailChange,
  onAddWalkIn,
  adding,
}: PlayerPickerProps) {
  const selected = new Set(selectedIds)

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-3 rounded-sm border border-line bg-surface p-4 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault()
          onAddWalkIn()
        }}
      >
        <label>
          <span className="mb-1 block text-sm text-muted">Add someone</span>
          <input
            type="text"
            value={walkInName}
            onChange={(event) => onWalkInNameChange(event.target.value)}
            placeholder="Name"
            autoComplete="name"
            className="w-full rounded-sm border border-line bg-bg px-4 py-3 outline-none focus-visible:border-accent"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm text-muted">Email (optional)</span>
          <input
            type="email"
            value={walkInEmail}
            onChange={(event) => onWalkInEmailChange(event.target.value)}
            placeholder="email@example.com"
            autoComplete="email"
            className="w-full rounded-sm border border-line bg-bg px-4 py-3 outline-none focus-visible:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={adding || walkInName.trim().length < 2}
          className="self-end rounded-sm bg-accent px-5 py-3 font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add to field
        </button>
      </form>

      <div className="flex flex-col gap-3 md:flex-row">
        <label className="flex-1">
          <span className="sr-only">Search guests</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-sm border border-line bg-surface px-4 py-3 outline-none focus-visible:border-accent"
          />
        </label>
        <label className="flex items-center gap-2 rounded-sm border border-line bg-surface px-4 py-3">
          <input
            type="checkbox"
            checked={checkedOnly}
            onChange={(event) => onCheckedOnlyChange(event.target.checked)}
            className="accent-accent"
          />
          <span>Checked in only</span>
        </label>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: FIELD_SIZE }, (_, index) => {
          const guest = pool.find((item) => item.id === selectedIds[index])
          return (
            <li
              key={guest?.id ?? `slot-${index}`}
              className="rounded-sm border border-line bg-surface px-3 py-2"
            >
              <p className="font-display text-[11px] tracking-[0.16em] text-muted">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="truncate text-sm">{guest?.name ?? "Open slot"}</p>
            </li>
          )
        })}
      </ol>

      <ul className="grid max-h-[28rem] gap-1 overflow-auto rounded-sm border border-line">
        {guests.map((guest) => {
          const isSelected = selected.has(guest.id)
          const full = selected.size >= FIELD_SIZE && !isSelected
          return (
            <li key={guest.id}>
              <button
                type="button"
                onClick={() => onToggle(guest.id)}
                disabled={full}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none focus-visible:bg-surface-2 disabled:opacity-40 ${
                  isSelected ? "bg-accent text-on-accent" : "bg-surface hover:bg-surface-2"
                }`}
              >
                <span>
                  <span className="block font-medium">{guest.name}</span>
                  <span className={`block text-sm ${isSelected ? "text-on-accent/70" : "text-muted"}`}>
                    {guest.email || "Walk-in"}
                  </span>
                </span>
                <span className="text-xs tracking-[0.14em] uppercase">
                  {guest.checkedIn ? "In" : "Listed"}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
