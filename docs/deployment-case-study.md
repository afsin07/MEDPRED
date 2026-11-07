# Deployment Case Study

## Platforms reviewed
- Render — straightforward Flask web service deployment; database must be supplied separately.
- Railway — convenient application/database deployment with usage-based pricing considerations.
- Vercel — strong choice for static/frontend hosting.
- Netlify — strong static/frontend hosting option.
- Google Cloud, Azure, AWS — broader infrastructure, more configuration, and more operational responsibility.

## Recommended architecture for MediPredict
Vercel or Netlify for the frontend + Render for the Flask API + managed MySQL for production data. Environment variables should hold credentials and secrets. HTTPS, least-privilege DB users, CORS restrictions, secure cookies, and secret rotation are basic production controls.
