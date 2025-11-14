PYTHON ?= python3

.PHONY: check serve new-pack

check:
	$(PYTHON) scripts/validate_questions.py

serve:
	cd docs && $(PYTHON) -m http.server 4173

new-pack:
	@if [ -z "$(TRACK)" ]; then echo "Usage: make new-pack TRACK=slug [TITLE='Name'] [DESCRIPTION='One-liner'] [FORCE=1]"; exit 1; fi
	$(PYTHON) scripts/create_question_pack.py "$(TRACK)" \
		$(if $(TITLE),--title "$(TITLE)",) \
		$(if $(DESCRIPTION),--description "$(DESCRIPTION)",) \
		$(if $(FORCE),--force,)
