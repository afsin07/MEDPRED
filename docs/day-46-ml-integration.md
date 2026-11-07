# Day 46 — ML Integration

## Architecture
React/static frontend → Flask `/api/predict` → Python prediction module → JSON response.

> The original MediPredict project did not contain a serialized trained ML artifact. Its prediction logic was a JavaScript educational health-scoring engine. Day 46 moves that existing logic into `backend/ml/model.py` and exposes it through Flask without claiming it is a trained clinical model.

## Endpoint
`POST /api/predict`

Required fields: `bloodPressure`, `bloodSugar`, `sleepHours`, `stressLevel`, `smoking`, `alcohol`, `activity`, `diet`. Optional arrays: `symptoms`, `existingConditions`.

## Response
The API returns `success`, `prediction`, and `model`. Invalid or missing input returns HTTP 400 with a JSON error.

## Tests
Use Thunder Client. Capture: successful prediction, missing input, invalid value, and repeated prediction.

| Test | Method | Expected |
|---|---|---|
| Valid Prediction | POST | 200 |
| Missing Input | POST | 400 |
| Invalid Input | POST | 400 |
| Empty JSON | POST | 400 |
