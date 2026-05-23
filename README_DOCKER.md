# Run project with Docker

Requirements: Docker and Docker Compose (v2) installed.

Quick start (build, start services and run tests):

```bash
# from project root
docker compose up --build -d

# Run tests
docker compose run --rm tests

# View logs
docker compose logs -f
# Truy cap trang web
http://127.0.0.1:5500/frontend/html/core/landing.html
# Stop and remove
docker compose down -v
```

What this does:
- `db`: Postgres container
- `backend`: FastAPI backend (serves API, static `/uploads`, and chatbot assets)
- `chatbot`: standalone chatbot service
- `tests`: runs `pytest` after waiting for backend and chatbot

Setup details:
- The compose file loads environment variables from `backend/.env`
- `DATABASE_URL` is overridden in compose for the local Postgres container
- The backend entrypoint runs `alembic upgrade head` before starting the FastAPI app
- The backend entrypoint also synchronizes the seed catalog data from `project_seed_data/Dataset_goc` after migrations

Recommended startup sequence:
1. `docker compose up --build -d`
2. wait for backend on `http://localhost:8000/`
3. wait for chatbot on `http://localhost:8001/health`
4. `docker compose run --rm tests`

Notes:
- The Docker image installs Python dependencies from `backend/requirements.txt` and `CHAT BOT/backend/requirements_standalone.txt`.
- Tests are in `tests/test_integration.py` and use the same admin credentials defined in `backend/.env`.
- If you need to change credentials or SMTP settings, update `backend/.env` and restart the containers.
