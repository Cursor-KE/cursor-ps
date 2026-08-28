import { readTournament } from "@/lib/tournament-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const tournament = await readTournament()
  return Response.json(tournament, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}
