# Hemlig tomte 🎅

Static Secret Santa site in Swedish. No server, no build step.

- `admin.html` – add participants, exclusions and last year's matches, draw, then copy or email each person's link.
- `index.html` – the family page. Opened via a personal link (`index.html#<token>`), it shows who to buy for, a countdown to julafton and the rules.

## Use it
1. Upload the whole folder to any static host (GitHub Pages, Netlify, your own web space).
2. Open `admin.html` on the hosted site. The "Adress till familjesidan" field fills in automatically.
3. Add everyone, draw, and send the links with "Mejla" or "Kopiera".
4. Click "Exportera lottning" and keep the file. Import it next year so nobody gets the same person twice.

Admin data lives only in the browser you used (localStorage). The admin page isn't linked from the family page, but anyone who finds it just sees an empty form in their own browser.

Links are scrambled, not encrypted. Anyone holding a link can see what it contains, and the organizer can reveal all matches with the "Visa" toggle.

## Tests
```sh
osascript -l JavaScript tests/draw.test.js        # draw logic, macOS only
ruby -run -e httpd . -p 8765                       # then open http://127.0.0.1:8765/tests/e2e.html
```
The end-to-end page drives both pages in an iframe. It wipes the admin data stored for that origin.
