# MediPredict — Run Locally (Windows / macOS / Linux)

## Requirements
- Python 3.10+ (3.11 or 3.12 recommended)
- MySQL 8 running locally (or any MySQL-compatible server)

## 1. Create the database (once)
```sql
CREATE DATABASE medipredict;
```
Tables (`users`, `health_reports`) are created automatically when the backend starts.

## 2. Backend
```bash
cd backend
python -m venv venv
# Windows:      venv\Scripts\activate
# macOS/Linux:  source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
```
Edit `backend/.env` and set `DB_PASSWORD` (your MySQL root password) and `SESSION_SECRET`.
Then start it:
```bash
python app.py
```
Check http://127.0.0.1:5000/api/health — it should show `"database": "connected"`.

## 3. Frontend (second terminal)
```bash
cd frontend
python -m http.server 3000
```
Open http://127.0.0.1:3000 (use 127.0.0.1 or localhost, not file://).

## Windows shortcuts
Double-click `start_backend.bat` and `start_frontend.bat`.

## Retrain the ML model (optional)
```bash
cd backend
python ml/train_model.py
```
