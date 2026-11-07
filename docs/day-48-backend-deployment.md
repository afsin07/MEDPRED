# Day 48 — Backend Deployment

Backend platform target: Render. Runtime: Python/Flask.

Build: `pip install -r requirements.txt`
Start: `gunicorn app:app --bind 0.0.0.0:$PORT`

Environment variables: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, SESSION_SECRET, CORS_ORIGINS, SESSION_COOKIE_SECURE.

The backend is intentionally separate from the frontend and exposes `/api/health` and `/api/predict`.
