# Trifecta Study Suite

A static, lightweight study app that helps learners prepare for CompTIA A+, Network+, and Security+ exams. The app runs entirely on GitHub Pages (or any static host) using client-side JSON question banks.

## Features
- Modular JSON question banks for each exam track
- Flashcards with lightweight spaced repetition logic
- Multiple choice quiz mode with instant feedback
- Performance-Based Question (PBQ) lab with ordering, matching, and command-entry tasks
- Mobile-first layout using vanilla HTML/CSS/JS

## Project Structure
```
trifecta-study-suite/
├── index.html          # Single-page app shell
├── styles.css          # Tailored responsive styles
├── app.js              # UI + study logic (flashcards, quizzes, PBQs)
├── manifest.json       # Install metadata (optional)
├── icons/              # App icons referenced by the manifest
└── questions/          # Question banks + schema
    ├── schema.json
    ├── aplus-1201.json
    ├── aplus-1202.json
    ├── securityplus.json
    ├── networkplus.json
    └── aplus-pbq.json   # Scenario definitions for the PBQ view
```

## Adding New Question Banks
1. Create a JSON file in `questions/` that follows `questions/schema.json`.
2. Append the new track metadata inside `app.js` by updating the `TRACKS` constant with a unique key, title, description, and file path.
3. Reference that key anywhere in the UI (dropdowns populate automatically once `TRACKS` is updated).

## Authoring PBQs
1. Open `questions/aplus-pbq.json`.
2. Each object needs an `id`, `title`, `type`, `prompt`, and `explanation`.
3. Supported `type` values today:
   - `ordering`: Provide `items` (id/label) plus `solution` array.
   - `matching`: Provide `pairs` (with `left`+`answer`) and shared `options`.
   - `command`: Provide `expected` commands array and optional `placeholder`.
4. Refresh the site; the PBQ dropdown auto-populates with your new scenario.

## Local Development
1. From the repo root run `make serve` (or `python3 -m http.server 4173` inside `docs/`) so that the fetch calls can read the JSON banks over HTTP.
2. Visit `http://localhost:4173`.
3. Any changes to files will be reflected on refresh.

## Validating Question Banks
- Run `make check` (alias for `python3 scripts/validate_questions.py`) before committing.  
  It lints every multiple-choice JSON file, enforces that answers match available choices, and sanity-checks PBQ definitions.

## Deploying to GitHub Pages
1. Push the entire `trifecta-study-suite` folder to a GitHub repository (e.g., `username/trifecta-study-suite`).
2. In repository settings → Pages, select the `main` branch and `/ (root)` folder.
3. Wait for the deployment to finish; your app will be live at `https://username.github.io/trifecta-study-suite/`.
4. The app behaves like a standard website; the latest assets are always fetched online.

## Browser Support
The app relies on modern browsers with `fetch` and ES modules. All evergreen browsers (Chrome, Edge, Safari, Firefox) are supported. For legacy browsers, transpilation would be required.
