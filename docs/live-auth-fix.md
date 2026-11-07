# Live authentication deployment fix

The frontend now selects the local Flask API only on localhost/file development and uses the Render API on deployed hosts.

Production API:
`https://medipredict-znxz.https://deploy-p2dm.onrender.com`

For Render, set these environment variables:
- `SESSION_COOKIE_SECURE=true`
- `SESSION_COOKIE_SAMESITE=None`
- `CORS_ORIGINS=<your exact Vercel production URL>`

No passwords, API keys, or database credentials belong in this file.
