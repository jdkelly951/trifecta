# Trifecta

Static Cert Study Suite that lives in `docs/` so it can be hosted via GitHub Pages or any static host.

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
- `Makefile` – convenience targets for validation and local serving

See `docs/README.md` for the in-depth description of how the study app works.
