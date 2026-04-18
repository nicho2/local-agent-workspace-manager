.PHONY: api-dev api-test web-dev

api-dev:
	cd apps/api && python -m uvicorn app.main:app --reload

api-test:
	cd apps/api && pytest

web-dev:
	cd apps/web && npm run dev
