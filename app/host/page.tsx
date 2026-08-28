import { HostDesk } from "@/app/host/host-desk"
import { guests } from "@/lib/guests"
import { readTournament } from "@/lib/tournament-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function HostPage() {
  const tournament = await readTournament()
  return <HostDesk guests={guests} initialTournament={tournament} />
}
