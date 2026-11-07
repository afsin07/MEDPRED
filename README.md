# MediPredict —
Full-Stack AI Project

MediPredict is an educational health-assessment application. It provides a web-based health assessment workflow, sends assessment data to a Flask backend, stores application data in MySQL, and uses the integrated health-scoring/prediction engine to generate an educational assessment report.

> **Important:** MediPredict is an educational/demo prediction application and does not provide professional medical diagnosis.

## Architecture

```text
User / Browser
      ↓
Vercel Frontend
      ↓ HTTPS API requests
Render Flask Backend
      ├──────────→ Aiven MySQL Database
      │
      └──────────→ Health Prediction Engine
      ↓
Prediction / Assessment Report
      ↓
Frontend
```

### Main Components

- **Frontend:** HTML, CSS and JavaScript
- **Backend:** Python Flask
- **Database:** MySQL hosted on Aiven
- **Prediction Engine:** Python-based educational health-scoring engine
- **Frontend Deployment:** Vercel
- **Backend Deployment:** Render
- **Source Control:** GitHub

## Project Structure

```text
MediPredict/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── ...
├── frontend/
│   ├── *.html
│   ├── app.css
│   └── js/
│       ├── auth.js
│       ├── config.js
│       └── ...
├── docs/
├── .gitignore
├── render.yaml
├── vercel.json
└── README.md
```

## Run Locally

### Backend

Open a terminal:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Configure the required database and session environment variables, then run:

```powershell
python app.py
```

The Flask API runs locally on:

```text
http://127.0.0.1:5000
```

### Frontend

Open a second terminal:

```powershell
cd frontend
python -m http.server 3000
```

Open:

```text
http://127.0.0.1:3000
```

The frontend automatically uses the local Flask API when accessed through localhost/127.0.0.1.

## Production Deployment

### Frontend — Vercel

**Current live frontend:**

```text
https://deploy-nine-phi-35.vercel.app/
```

The Vercel deployment serves the MediPredict frontend. The production frontend is configured to communicate with the deployed Flask backend through `frontend/js/config.js`.

### Backend — Render

**Production backend:**

```text
https://deploy-p2dm.onrender.com
```

**Health endpoint:**

```text
https://deploy-p2dm.onrender.com/api/health
```

The Flask application is served in production using Gunicorn and uses the `PORT` environment variable provided by Render.

### Database — Aiven MySQL

The production backend connects to an Aiven MySQL database using environment variables for:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL_CA` when required by the deployment configuration

The production database connection uses SSL/TLS.

## Environment Variables

Sensitive configuration must not be committed to GitHub.

Typical backend environment variables include:

```text
PORT
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
SESSION_SECRET
SESSION_COOKIE_SAMESITE
SESSION_COOKIE_SECURE
CORS_ORIGINS
DB_SSL_CA
```

The local `.env` file is excluded from Git using `.gitignore`.

For production, environment variables and secrets are configured through the cloud service settings rather than hard-coded in source files.

## API Endpoints

The MediPredict backend provides application endpoints including:

- `GET /api/health`
- `GET /api/model`
- `POST /api/predict`
- `POST /api/register`
- `POST /api/login`
- `GET /api/session`
- `GET /api/me`
- `POST /api/logout`
- Report-related `GET`, `POST`, `PUT` and `DELETE` endpoints
- Admin-related endpoints for users and reports

### API Health Check

The health endpoint can be opened directly in a browser:

```text
https://deploy-p2dm.onrender.com/api/health
```

It reports the Flask backend status, prediction engine status, and database readiness.

## Authentication Workflow

```text
Create Account
      ↓
Login
      ↓
Server Session
      ↓
Dashboard
      ↓
New Assessment
```

The frontend sends authenticated requests to the Flask backend using session credentials.

## Assessment and Prediction Workflow

```text
New Assessment
      ↓
Health / Lifestyle / Condition Inputs
      ↓
POST /api/predict
      ↓
Flask Backend
      ↓
Prediction Engine
      ↓
Assessment Result
      ↓
Report Display
```

The application was tested in the live environment for account creation, sign in, new assessment submission, prediction generation and report generation.

## ML / Prediction Engine Note

The source project does not contain a serialized trained ML model. The existing JavaScript health-scoring rules were ported to Python so that the prediction behavior is served by Flask.

Therefore, the current prediction component is an **educational/demo health-scoring engine**, not a trained clinical diagnostic model.

## Testing and Verification

The deployed MediPredict system was verified across the complete application flow:

- Frontend loads successfully
- Account creation works
- Sign in works
- Authentication/session works
- New assessment submission works
- Prediction generation works
- Assessment reports are generated successfully
- Flask backend is running
- Aiven MySQL connection is established
- Prediction engine is loaded
- Multiple valid assessment inputs were tested successfully

The live health endpoint is provided for checking the backend status, database readiness and prediction engine status.

## Final Integration — Day 51 & Day 52

The final integration connects all major project components into one workflow:

```text
React/Frontend UI
      ↓
Flask REST API
      ↓
MySQL Database + Prediction Engine
      ↓
JSON API Response
      ↓
Frontend Result / Report UI
```

During the finalization and integration stage, the project was reviewed for frontend-backend communication, database operations, ML/prediction integration, authentication, error handling, and deployment connectivity.

## Deployment Troubleshooting

During deployment, issues involving frontend/backend ports, Render port detection, CORS configuration, authentication/session communication and Vercel routing were identified and resolved.

Local development uses:

```text
Frontend → 127.0.0.1:5500
Backend  → 127.0.0.1:5000
```

Production uses:

```text
Vercel Frontend → Render Flask Backend → Aiven MySQL / Prediction Engine
```

The frontend production API configuration is stored in:

```text
frontend/js/config.js
```

Current production API base configured in that file:

```text
https://deploy-p2dm.onrender.com
```

## GitHub Repository

```text
https://github.com/afsin07/DEPLOY.git
```

## Live Application

**Frontend:**

```text
https://deploy-nine-phi-35.vercel.app/
```

**Backend:**

```text
https://deploy-p2dm.onrender.com
```

**Backend health check:**

```text
https://deploy-p2dm.onrender.com/api/health
```

## Security Notes

- Never commit `.env` files.
- Never commit passwords, API keys, session secrets or database credentials.
- Use environment variables for sensitive production configuration.
- Use HTTPS for production frontend/backend communication.
- Use SSL/TLS for the production MySQL connection.
- Restrict CORS to the production frontend origin.
- Use secure session-cookie settings in production.
- Validate user-provided assessment data on the backend.
- Avoid exposing internal server errors or sensitive configuration to users.

## Documentation

Project documentation for the development and deployment stages is available in the `docs/` directory, including:

- Day 46 ML integration
- Day 47 prediction UI
- Day 48 backend deployment
- Day 49 application deployment
- Day 50 final testing
- Day 51–52 final integration
- Deployment case study
- Live authentication fix
- Screenshot checklist

## Original Project Preservation

The original MediPredict animated frontend and existing project work are preserved as part of the project history. The Flask integration allows the health assessment data to be processed through the backend prediction endpoint rather than relying only on the previous browser-side scoring flow.


## ML Health Risk Assessment (Educational)

MediPredict now uses a trained **Random Forest** classifier as its primary health-risk prediction engine. The bundled model is trained on a **synthetic educational dataset** included under `data/health_risk_training_dataset.csv`. It is not a clinical model and the reported evaluation metrics are not clinical validation.

The API remains `POST /api/predict`; the frontend continues to use the existing workflow. Model artifact: `backend/ml/health_risk_model.joblib`. See `docs/ml-model-training.md` for training and evaluation details.

> **Educational use only:** MediPredict does not diagnose disease or replace professional medical advice. Do not use it for real clinical decisions or real patient data.
