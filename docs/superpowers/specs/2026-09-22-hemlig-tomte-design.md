# Hemlig tomte – design

Static site, no server, no build step. Swedish UI throughout.

## Pages
- `admin.html` – organizer config. Participants (name, email, "last year bought for"),
  exclusion pairs (symmetric), draw button, result list with copy + mailto per person,
  assignments hidden behind a "visa" toggle, export/import of the draw as JSON
  (import fills "last year" for next year). State persisted in localStorage.
- `index.html` – family page. Snow, Christmas palette, greeting, gift box that
  reveals the recipient on click, countdown to julafton 24 Dec 15:00 (Europe/Stockholm),
  rules (max 500 SEK, keep it secret, wrap and label the gift). Friendly error for bad links;
  landing view without a link.

## Links
`index.html#<token>`. Token = base64url of JSON `{g, r, y}` XOR-scrambled with a random
per-link key prepended. The fragment never reaches the host. This is obfuscation against
casual peeking, not security: anyone holding a link can read it.

## Draw
Constraints: no self, no excluded pair (both directions), no repeat of last year's giver→receiver.
Uniform rejection sampling of permutations first, randomized backtracking as fallback.
Reports "too few" or "impossible" instead of looping forever.

## Testing
Draw logic unit-tested headless via macOS JavaScript for Automation (`osascript -l JavaScript`).
End-to-end flow verified in Chrome.
