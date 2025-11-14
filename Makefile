PYTHON ?= python3

.PHONY: check serve

check:
	$(PYTHON) scripts/validate_questions.py

serve:
	cd docs && $(PYTHON) -m http.server 4173
