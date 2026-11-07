# Day 49 — Complete Application Deployment

Frontend and backend are deployable independently. The static frontend can be hosted on Vercel/Netlify and configured to call the live Flask API through `MEDIPREDICT_API_BASE` in `frontend/js/config.js`.

Before deployment verify student/auth/report APIs, prediction API, CORS, database persistence, and error handling. Do not publish `.env` or credentials.
