# Plan

1. ✅ **Import guest pool** — Load the Luma CSV into the app (name, email, check-in) so the host can search the real guest list. _(Skill: nextjs)_
   - Output: `data/guests.json`
2. ✅ **Host picker** — Search/filter guests, tap to select exactly 16, then lock the field. _(Skill: frontend-design)_
   - Output: `app/host/host-desk.tsx`
   - Output: `components/player-picker.tsx`
3. ✅ **Draw 8v8 bracket** — Shuffle the 16 and pair them into Round of 16, then empty QF / SF / Final slots. _(Skill: nextjs)_
   - Output: `lib/bracket.ts`
4. ✅ **Live match table** — Enter scores on each tie; winners auto-advance through quarters, semis, and the final. _(Skill: frontend-design)_
   - Output: `components/score-sheet.tsx`
5. ✅ **Room display** — Big-screen knockout view for the projector, with names only (emails stay on the host screen). _(Skill: frontend-design)_
   - Output: `app/board/room-board.tsx`
   - Output: `components/knockout-bracket.tsx`
