# Trifecta Study Suite

A static, lightweight study app (born from the Trifecta project) that helps learners prepare for CompTIA A+, Network+, and Security+ exams. The app runs entirely on GitHub Pages (or any static host) using client-side JSON question banks, so it behaves like a native study tool on your phone once you add it to the home screen.

## Features
- Modular JSON question banks for each exam track
- Flashcards with lightweight spaced repetition logic
- Multiple choice quiz mode with instant feedback
- Timed exam simulator with configurable duration, live pacing stats, and history
- Performance-Based Question (PBQ) lab with ordering, matching, and command-entry tasks
- Mobile-first layout using vanilla HTML/CSS/JS
- Tag-aware filtering that prioritizes weak domains and surfaces accuracy per objective
- Optional backend sync so learners can carry flashcard states, PBQs, and exam history between devices

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
1. Each track has its own PBQ file (e.g., `aplus-pbq.json`, `networkplus-pbq.json`). The filename before `-pbq` becomes the slug referenced in `docs/questions/manifest.json`.
2. Every PBQ object needs an `id`, `title`, `type`, `prompt`, and `explanation`.
3. Supported `type` values today:
   - `ordering`: Provide `items` (id/label) plus `solution` array.
   - `matching`: Provide `pairs` (with `left`+`answer`) and shared `options`.
   - `command`: Provide `expected` commands array and optional `placeholder`.
4. Update `scripts/validate_questions.py --manifest docs/questions/manifest.json` so the PBQ manifest knows which CompTIA tracks map to your PBQ slug.
5. Refresh the site; the PBQ view now lets learners pick the track first, then the scenarios tied to that slug.

## Local Development
1. From the repo root run `make serve` (or `python3 -m http.server 4173` inside `docs/`) so that the fetch calls can read the JSON banks over HTTP.
2. Visit `http://localhost:4173`.
3. Any changes to files will be reflected on refresh.

## Offline & caching
- `sw.js` is registered with a `BUILD_VERSION` query string so every deployment gets a fresh cache bucket.
- The service worker precaches `index.html`, static assets, the question manifest, and all question banks referenced therein, so learners can continue working offline.
- Update `BUILD_VERSION` in `app.js` whenever you publish new content to bust caches.

## Timed Exam Mode
- Scroll to the **Timed Exam Mode** card under the Quizzes view.
- Select the CompTIA track, optionally lower the question cap (default 90) or duration (default 90 minutes), and press **Start timed exam**.
- The UI shows a countdown, per-question pacing hints, and navigation controls for forward/back review.
- Finishing or timing out stores a history entry with score, percentage, and elapsed time so you can track pacing improvements.

## Validating Question Banks
- Run `make check` (alias for `python3 scripts/validate_questions.py`) before committing.  
  It lints every multiple-choice JSON file, enforces that answers match available choices, and sanity-checks PBQ definitions.

## Deploying to GitHub Pages
1. Push the entire `trifecta-study-suite` folder (this repo) to GitHub.
2. In repository settings → Pages, select the `main` branch and `/ (root)` folder.
3. Wait for the deployment to finish; your app will be live at `https://username.github.io/<repo>/`.
4. The app behaves like a standard website; the latest assets are always fetched online.

## Install on your phone (PWA flow)
1. Load your GitHub Pages URL in mobile Safari (iOS) or Chrome/Edge (Android).
2. When prompted, tap **Add to Home Screen** / **Install App**. If the prompt doesn’t auto-trigger, open the browser menu and pick the install option manually.
3. Launch the new home-screen icon. The service worker caches everything for offline study sessions in bed, and any sync endpoint you configure will reconcile progress once you reconnect.

## Browser Support
The app relies on modern browsers with `fetch` and ES modules. All evergreen browsers (Chrome, Edge, Safari, Firefox) are supported. For legacy browsers, transpilation would be required.

## Syncing progress across devices
1. Copy `docs/config.example.json` to `docs/config.json`, then edit:
   - `"endpoint"` – REST API that accepts `GET /sync?learner=<id>` and `PUT /sync`.
   - `"learnerId"` – unique identifier for the student (email, UUID, etc.).
   - `"apiKey"` – optional bearer token if your API requires auth.
   - `"autoPull"` – set to `false` if you only want manual pushes.
2. (Optional) run `python3 scripts/dev_sync_server.py --port 8787` to start a zero-dependency JSON API that writes to `sync_store.json`.
3. Reload the app; the footer will show **Sync: Connected** when the adapter pulls remote state.  
4. Flashcard card states/stats, tag metrics, PBQ answers/history, and exam history now debounce to the sync endpoint after each study action, so you can resume on any browser pointing at the same config.
