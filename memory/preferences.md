---
type: preferences
updated: 2026-05-09
---

# Coding & Collaboration Preferences

## Response Style
- Short and direct — no trailing summaries after completing tasks
- No "Here's what I did" recaps; Ryan can read the diff
- One-sentence updates at key moments while working, then done
- No emojis unless asked

## Code Style
- No comments unless the WHY is non-obvious
- No multi-line docstrings or comment blocks
- TypeScript — always type things properly, fix implicit `any` errors
- Prefer editing existing files over creating new ones
- Don't add error handling for impossible scenarios
- Don't abstract until there are 3+ clear repetitions

## Testing / Safety
- Do NOT mock the database in tests — use real MongoDB connections
  (rationale: past incident where mocks passed but real migration failed)
- Always run `npx tsc --noEmit` after edits to confirm no TypeScript errors
- Read a file before editing it

## Git
- Only commit when explicitly asked
- Never force-push to main
- Never skip hooks (--no-verify)

## Admin UI Patterns
- Stats cards use Tailwind gradient backgrounds (from-X-500 to-X-600)
- Modals are fixed-position overlays with z-50
- Tables use `min-w-full divide-y divide-gray-200`
- All admin pages guard with `isAdmin(user.email)` + redirect to "/"
