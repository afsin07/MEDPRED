# MediPredict ML Model — Educational Health Risk Assessment

## What changed
MediPredict now uses a **trained Random Forest classifier** for the primary `riskLevel` prediction instead of the previous rule-based scoring engine.

## Dataset
The repository includes `data/health_risk_training_dataset.csv` containing 6,000 synthetic educational training examples generated with a fixed random seed. It is intentionally synthetic and is **not a clinical dataset**.

## Model
- Algorithm: Random Forest Classifier
- Trees: 250
- Max depth: 12
- Random seed: 42
- Artifact: `backend/ml/health_risk_model.joblib`
- Version: `rf-educational-1.0`

## Evaluation
The hold-out test split is 20% and stratified.

- Accuracy: 0.7992
- Weighted precision: 0.8004
- Weighted recall: 0.7992
- Weighted F1: 0.7975

These metrics only describe performance on the synthetic dataset and **must not be interpreted as clinical performance**.

## Training
Run:

```bash
cd backend
python ml/train_model.py
```

The training script regenerates the dataset and model artifact deterministically.

## API behavior
`POST /api/predict` keeps the existing input contract. The response now includes `modelType`, `modelVersion`, and `riskProbabilities` in addition to the report fields already used by the frontend.

## Safety / scope
MediPredict is an educational health-risk assessment platform. It does not diagnose disease, provide treatment, or replace professional medical advice. Do not enter real patient data into this student/demo application.
