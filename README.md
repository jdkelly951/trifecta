# Trifecta Study Suite

Static Trifecta Study Suite lives in `docs/` so it can be hosted via GitHub Pages or any static host.

## Quick Start
1. **Validate question banks** – `make check`
2. **Serve locally** – `make serve` then open [http://localhost:4173](http://localhost:4173)

Both commands rely on Python 3 (already available on most systems). Use `PYTHON=python3.12 make check` if you need a specific interpreter.

## Validation details
`make check` (or `python3 scripts/validate_questions.py`) performs:
- schema-style checks for every multiple-choice JSON file in `docs/questions/`
- structural checks for the PBQ definitions (`aplus-pbq.json`)
- failure output per file if anything is malformed, with a non-zero exit code for CI hooks.

Run `python3 scripts/validate_questions.py --quiet` to get a terse success log or pass file paths to lint a single bank.

## Project structure
- `docs/` – SPA assets (HTML, CSS, JS, manifest, icons, question JSON)
- `docs/questions/` – all flashcard/quiz banks plus PBQs and the JSON schema
- `scripts/validate_questions.py` – helper used by `make check`
- `scripts/create_question_pack.py` – scaffolds a new question pack template (`make new-pack`)
- `Makefile` – convenience targets for validation and local serving

## Offline support
The app registers the service worker in `docs/sw.js`, which precaches all core assets and question banks the first time the site loads. Once cached, learners can reopen the page without an internet connection—helpful prep for wrapping the web app into native store builds later. During local development keep using `make serve` (which runs a local HTTP server); otherwise the browser blocks the service worker.

## Adding question packs quickly
1. Run `make new-pack TRACK=network-troubleshooting TITLE="Network Troubleshooting" DESCRIPTION="Labs for N+ objectives"` to scaffold `docs/questions/network-troubleshooting.json` with a validated template. Pass `FORCE=1` to overwrite.
2. Replace the generated sample question with real content, keeping the schema identical to the existing banks.
3. `make check` catches schema mistakes before you commit.

The dashboard now shows live question counts (including PBQs) and surfaces your weakest quiz domains based on adaptive stats. As you add packs, the counts update automatically, so you can sanity-check volumes without digging through JSON manually.

## Firebase auth + entitlements
1. Copy `docs/firebase-config.sample.js` to `docs/firebase-config.js` and paste in your Firebase project keys (Project settings → General → Your apps).
2. Enable Google authentication in Firebase Console → Authentication.
3. Create a Firestore collection named `entitlements` where each document ID is the user’s `uid` and includes at least `{ tier: 'pro' }`. Optional fields like `expiresAt` are preserved for future logic.
4. Reload the site. The “Sign in” button in the header now authenticates with Google, syncs the entitlement, and updates the PBQ lock state automatically. Without the config file the button falls back to a “Setup sync” reminder so the static build still works.

`docs/firebase-client.js` dynamically loads the Firebase SDK over HTTPS, so no bundler is required. Entitlements default to the local `trifecta-study-suite::entitlement` key when no remote doc exists, which keeps offline dev/testing simple.

## Adaptive quizzes
- Every quiz question carries CompTIA domain tags. The SPA tracks per-tag accuracy in `localStorage` (`trifecta-study-suite::quiz-tags`) and surfaces weak areas in the Quizzes panel. Subsequent quizzes bias selection toward those tags until the learner’s accuracy improves.
- The “Reset adaptive data” button in the Quizzes section clears the stored tag history for the active track (or every track if none is selected). You can also call `localStorage.removeItem('trifecta-study-suite::quiz-tags')` while debugging.

## Pro tier scaffolding
- PBQs double as the first freemium boundary: the free tier only surfaces the first three scenarios and surfaces a CTA banner when more labs exist. Unlocking later simply means flipping the entitlement flag and re-rendering the select component—no extra UI wiring required.
- Entitlements currently live in `localStorage` (`trifecta-study-suite::entitlement`). Call `window.trifectaSetTier('pro')` in the browser console (or set the key manually) to simulate a subscriber; pass `'free'` to go back. When a real backend exists, update `initEntitlementStatus()`/`handleEntitlementUpdate()` in `docs/app.js` to read from your API instead.
- Upgrade buttons use the `data-upgrade` attribute so you can wire analytics or deep links later. Right now they just point learners to the PBQ banner and copy.

## One-time Pro unlock with Gumroad
If subscriptions feel like overkill, you can sell a lifetime “Pro unlock” code and let learners redeem it inside the SPA:

1. Create a Gumroad (or similar) product for the one-time unlock and set `UPGRADE_URL` in `docs/app.js` to the checkout URL.
2. Generate salted SHA-256 hashes for each unlock code with `node scripts/hash_unlock_code.js "YOUR-CODE"` and copy them into `docs/license-keys.js` (use `docs/license-keys.sample.js` as a template). Keep the real file out of version control.
3. Configure Gumroad to email the plain-text code to the buyer (include quick instructions like “Open the PBQ panel → Redeem code”).
4. When the user redeems the code in-app, the entitlement flag is stored locally, PBQ limits disappear, and the “Redeem” form disables itself.

This keeps monetization simple—no recurring billing or backend required—while still giving you the option to swap in a full API later.

Tip: add a button to your Gumroad success page that links to `https://yourdomain/?redeem=CODE`. The app detects the `redeem` query string and auto-applies the code so learners don’t have to copy/paste manually.

## Stripe checkout sketch
1. Create a Stripe Checkout session (recurring product called “Trifecta Pro”) and use the hosted Checkout link as the value of `UPGRADE_URL` in `docs/app.js`.
2. In Stripe dashboard, add a webhook (e.g., handled by a Cloudflare Worker) that listens for `checkout.session.completed` and `customer.subscription.deleted`.
3. The worker should verify the event signature, look up the Firebase user ID attached via Checkout metadata, and update the Firestore document (`entitlements/{uid}`) with `{ tier: 'pro', stripeSubscriptionId: '...', expiresAt: ... }`.
4. When the subscription is cancelled or expires, flip `tier` back to `'free'`. The SPA listens for auth state + entitlement changes and reflects the new status without needing a redeploy.

Until Stripe is wired, the upgrade buttons simply highlight the PBQ paywall banner. Once you have a live Checkout URL, drop it into `UPGRADE_URL` and the buttons will open it in a new tab.

See `docs/README.md` for the in-depth description of how the study app works.
