# Cert Study Suite

A static, lightweight study app that helps learners prepare for CompTIA A+, Network+, and Security+ exams. The app runs entirely on GitHub Pages (or any static host) using client-side JSON question banks.

## Features
- Modular JSON question banks for each exam track
- Flashcards with lightweight spaced repetition logic
- Multiple choice quiz mode with instant feedback
- Mobile-first layout using vanilla HTML/CSS/JS

## Project Structure
```
cert-study-suite/
├── index.html          # Single-page app shell
├── styles.css          # Tailored responsive styles
├── app.js              # UI + study logic (flashcards + quizzes)
├── manifest.json       # Install metadata (optional)
├── icons/              # App icons referenced by the manifest
└── questions/          # Question banks + schema
    ├── schema.json
    ├── aplus-1201.json
    ├── aplus-1202.json
    ├── securityplus.json
    └── networkplus.json
```

## Adding New Question Banks
1. Create a JSON file in `questions/` that follows `questions/schema.json`.
2. Append the new track metadata inside `app.js` by updating the `TRACKS` constant with a unique key, title, description, and file path.
3. Reference that key anywhere in the UI (dropdowns populate automatically once `TRACKS` is updated).

## Local Development
1. From the `cert-study-suite` folder, run a lightweight static server so that fetch calls work properly:
   ```bash
   python3 -m http.server 4173
   ```
2. Visit `http://localhost:4173`.
3. Any changes to files will be reflected on refresh.

## Deploying to GitHub Pages
1. Push the entire `cert-study-suite` folder to a GitHub repository (e.g., `username/cert-study-suite`).
2. In repository settings → Pages, select the `main` branch and `/ (root)` folder.
3. Wait for the deployment to finish; your app will be live at `https://username.github.io/cert-study-suite/`.
4. The app behaves like a standard website; the latest assets are always fetched online.

## Browser Support
The app relies on modern browsers with `fetch` and ES modules. All evergreen browsers (Chrome, Edge, Safari, Firefox) are supported. For legacy browsers, transpilation would be required.
