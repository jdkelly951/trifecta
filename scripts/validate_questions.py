#!/usr/bin/env python3
"""Validate Cert Study Suite question banks."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, List, Sequence

ROOT = Path(__file__).resolve().parents[1]
QUESTION_DIR = ROOT / "docs" / "questions"
MC_ALLOWED_KEYS = {"question", "choices", "answer", "explanation", "tags"}
PBQ_TYPES = {"ordering", "matching", "command"}


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # pragma: no cover - best effort logging
        raise ValueError(f"Failed to load {path}: {exc}") from exc


def validate_multiple_choice(path: Path, data: object) -> List[str]:
    errors: List[str] = []
    if not isinstance(data, list):
        return ["Root element must be a list of question objects"]

    for idx, item in enumerate(data):
        prefix = f"{path.name}[{idx}]"
        if not isinstance(item, dict):
            errors.append(f"{prefix}: expected object, got {type(item).__name__}")
            continue

        required_missing = {k for k in ("question", "choices", "answer", "explanation") if k not in item}
        if required_missing:
            errors.append(f"{prefix}: missing required fields {sorted(required_missing)}")
            continue

        unexpected = set(item.keys()) - MC_ALLOWED_KEYS
        if unexpected:
            errors.append(f"{prefix}: unexpected keys {sorted(unexpected)}")

        question = item.get("question")
        if not isinstance(question, str) or len(question.strip()) < 8:
            errors.append(f"{prefix}: question must be a non-empty string with reasonable length")

        choices = item.get("choices")
        if not isinstance(choices, list):
            errors.append(f"{prefix}: choices must be a list")
        else:
            if not (4 <= len(choices) <= 6):
                errors.append(f"{prefix}: choices must contain between 4 and 6 entries (found {len(choices)})")
            for choice in choices:
                if not isinstance(choice, str) or not choice.strip():
                    errors.append(f"{prefix}: choices must only contain non-empty strings")
                    break

        answer = item.get("answer")
        if not isinstance(answer, str) or not answer.strip():
            errors.append(f"{prefix}: answer must be a non-empty string")
        elif isinstance(choices, list) and answer not in choices:
            errors.append(f"{prefix}: answer '{answer}' not found in choices")

        explanation = item.get("explanation")
        if not isinstance(explanation, str) or len(explanation.strip()) < 8:
            errors.append(f"{prefix}: explanation must be descriptive text")

        tags = item.get("tags")
        if tags is not None:
            if not isinstance(tags, list) or any(not isinstance(tag, str) or not tag.strip() for tag in tags):
                errors.append(f"{prefix}: tags must be a list of non-empty strings when provided")

    return errors


def validate_pbq(path: Path, data: object) -> List[str]:
    errors: List[str] = []
    if not isinstance(data, list):
        return ["Root element must be a list of PBQ objects"]

    for idx, item in enumerate(data):
        prefix = f"{path.name}[{idx}]"
        if not isinstance(item, dict):
            errors.append(f"{prefix}: expected object, got {type(item).__name__}")
            continue
        for field in ("id", "title", "type", "prompt", "explanation"):
            if field not in item:
                errors.append(f"{prefix}: missing required field '{field}'")
        pbq_type = item.get("type")
        if pbq_type not in PBQ_TYPES:
            errors.append(f"{prefix}: type must be one of {sorted(PBQ_TYPES)}, got '{pbq_type}'")
            continue
        if pbq_type == "ordering":
            errors.extend(_validate_ordering(prefix, item))
        elif pbq_type == "matching":
            errors.extend(_validate_matching(prefix, item))
        elif pbq_type == "command":
            errors.extend(_validate_command(prefix, item))
    return errors


def _validate_ordering(prefix: str, item: Dict[str, object]) -> List[str]:
    errors: List[str] = []
    items = item.get("items")
    solution = item.get("solution")
    if not isinstance(items, list) or not items:
        errors.append(f"{prefix}: ordering PBQ must define a non-empty 'items' list")
        return errors
    item_ids = []
    for entry in items:
        if not isinstance(entry, dict):
            errors.append(f"{prefix}: each ordering item must be an object")
            continue
        if "id" not in entry or "label" not in entry:
            errors.append(f"{prefix}: ordering items require 'id' and 'label'")
            continue
        item_ids.append(entry["id"])
    if not isinstance(solution, list) or len(solution) != len(item_ids):
        errors.append(f"{prefix}: solution must list each item id exactly once")
    elif set(solution) != set(item_ids):
        errors.append(f"{prefix}: solution IDs must match the provided items")
    return errors


def _validate_matching(prefix: str, item: Dict[str, object]) -> List[str]:
    errors: List[str] = []
    pairs = item.get("pairs")
    options = item.get("options")
    if not isinstance(pairs, list) or not pairs:
        errors.append(f"{prefix}: matching PBQ must include at least one pair")
        return errors
    if not isinstance(options, list) or not options:
        errors.append(f"{prefix}: matching PBQ must include selectable 'options'")
        return errors
    option_ids = set()
    for opt in options:
        if not isinstance(opt, dict) or "id" not in opt or "label" not in opt:
            errors.append(f"{prefix}: options must contain objects with 'id' and 'label'")
            continue
        option_ids.add(opt["id"])
    for pair in pairs:
        if not isinstance(pair, dict):
            errors.append(f"{prefix}: each pair must be an object")
            continue
        for field in ("id", "left", "answer"):
            if field not in pair:
                errors.append(f"{prefix}: matching pairs require '{field}'")
        ans = pair.get("answer")
        if ans not in option_ids:
            errors.append(f"{prefix}: pair answer '{ans}' not found in options")
    return errors


def _validate_command(prefix: str, item: Dict[str, object]) -> List[str]:
    errors: List[str] = []
    expected = item.get("expected")
    if not isinstance(expected, list) or not expected:
        errors.append(f"{prefix}: command PBQ must define a non-empty 'expected' command list")
        return errors
    for cmd in expected:
        if not isinstance(cmd, str) or not cmd.strip():
            errors.append(f"{prefix}: expected commands must be non-empty strings")
            break
    placeholder = item.get("placeholder")
    if placeholder is not None and (not isinstance(placeholder, str)):
        errors.append(f"{prefix}: placeholder must be a string when provided")
    return errors


def discover_files(selected: Sequence[str] | None) -> List[Path]:
    paths: List[Path] = []
    if selected:
        for entry in selected:
            path = Path(entry)
            if not path.is_absolute():
                path = ROOT / entry
            if not path.exists():
                raise FileNotFoundError(f"Question file '{entry}' not found")
            paths.append(path)
        return paths
    for path in sorted(QUESTION_DIR.glob('*.json')):
        if path.name == 'schema.json':
            continue
        paths.append(path)
    return paths


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate question banks and PBQs.")
    parser.add_argument(
        "paths",
        nargs="*",
        help="Optional paths to specific JSON files. Defaults to every file in docs/questions/.",
    )
    parser.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        help="Only print failures.",
    )
    args = parser.parse_args()

    files = discover_files(args.paths)
    had_error = False
    for path in files:
        rel = path.relative_to(ROOT)
        try:
            data = load_json(path)
            if path.name.endswith('pbq.json'):
                errors = validate_pbq(path, data)
            else:
                errors = validate_multiple_choice(path, data)
            count = len(data) if isinstance(data, list) else 0
        except Exception as exc:  # pragma: no cover - execution helper
            errors = [str(exc)]
            count = 0
        if errors:
            had_error = True
            print(f"[FAIL] {rel}")
            for err in errors:
                print(f"  - {err}")
        elif not args.quiet:
            print(f"[ OK ] {rel} ({count} entries)")
    if had_error:
        return 1
    if not args.quiet:
        print("All question banks look good! ✨")
    return 0


if __name__ == "__main__":
    sys.exit(main())
