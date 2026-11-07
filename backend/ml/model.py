"""MediPredict ML health-risk assessment engine.

Educational only. The bundled Random Forest model is trained on a synthetic,
programmatically generated dataset. It is NOT a clinical diagnostic model and
must not be used to make medical decisions.
"""
from pathlib import Path
import joblib

MODEL_PATH = Path(__file__).resolve().parent / "health_risk_model.joblib"
BUNDLED = joblib.load(MODEL_PATH)
PIPELINE = BUNDLED["pipeline"]
FEATURES = BUNDLED["features"]
MODEL_VERSION = BUNDLED.get("model_version", "rf-educational-1.0")

REQUIRED_FIELDS=["bloodPressure","bloodSugar","sleepHours","stressLevel","smoking","alcohol","activity","diet"]
ALLOWED={
 "bloodPressure":{"low","normal","high"}, "bloodSugar":{"low","normal","high"},
 "smoking":{"no","occasionally","yes"}, "alcohol":{"no","occasional","frequent"},
 "activity":{"sedentary","light","moderate","active"}, "diet":{"balanced","irregular","highSugarFat"}
}
SYMPTOMS=['fever','cough','headache','fatigue','dizziness','chestPain','shortnessOfBreath','frequentUrination','excessiveThirst','blurredVision','weightLoss','soreThroat','runnyNose','nausea']
CONDITIONS=['hypertension','diabetes','asthma','heartDisease']


def validate_input(data):
    if not isinstance(data,dict) or not data: raise ValueError("Request JSON body is required")
    missing=[f for f in REQUIRED_FIELDS if f not in data or data[f] in (None,"")]
    if missing: raise ValueError("Missing required fields: "+", ".join(missing))
    for field,values in ALLOWED.items():
        if not isinstance(data[field],str) or data[field] not in values: raise ValueError(f"Invalid value for {field}")
    for field,low,high in [("sleepHours",0,24),("stressLevel",0,10)]:
        try: value=float(data[field])
        except (TypeError,ValueError): raise ValueError(f"Invalid numeric value for {field}")
        if value<low or value>high: raise ValueError(f"Invalid value for {field}")
    for field in ("symptoms","existingConditions"):
        if field in data and not isinstance(data[field],list): raise ValueError(f"{field} must be an array")


def _features(a):
    symptoms=a.get('symptoms') if isinstance(a.get('symptoms'),list) else []
    existing=a.get('existingConditions') if isinstance(a.get('existingConditions'),list) else []
    row={
      'bloodPressure':a['bloodPressure'],'bloodSugar':a['bloodSugar'],'sleepHours':float(a['sleepHours']),
      'stressLevel':float(a['stressLevel']),'smoking':a['smoking'],'alcohol':a['alcohol'],'activity':a['activity'],'diet':a['diet'],
      'symptomCount':sum(1 for s in symptoms if s in SYMPTOMS),
      'existingConditionCount':sum(1 for c in existing if c in CONDITIONS),
    }
    row.update({f'symptom_{s}':int(s in symptoms) for s in SYMPTOMS})
    row.update({f'condition_{c}':int(c in existing) for c in CONDITIONS})
    return row


def _condition_indicators(a):
    s=set(a.get('symptoms') or []); e=set(a.get('existingConditions') or [])
    candidates=[]
    rules=[
      ('Cardiovascular Risk Pattern', {'chestPain','shortnessOfBreath','dizziness','headache'}, {'hypertension','heartDisease'}),
      ('Diabetes Risk Pattern', {'frequentUrination','excessiveThirst','blurredVision','weightLoss','fatigue'}, {'diabetes'}),
      ('Respiratory Pattern', {'cough','shortnessOfBreath','chestPain','fever'}, {'asthma'}),
      ('Flu / Cold Symptom Pattern', {'fever','cough','soreThroat','runnyNose','fatigue','headache'}, set()),
      ('Stress & Sleep Disruption Pattern', {'fatigue','headache','dizziness'}, set()),
    ]
    for name,sx,conds in rules:
        score=len(s & sx)*18 + len(e & conds)*28
        if score: candidates.append({'name':name,'percent':min(100,score)})
    candidates.sort(key=lambda x:x['percent'],reverse=True)
    return candidates[:3]


def predict(answers):
    validate_input(answers)
    row=_features(answers)
    import pandas as pd
    X=pd.DataFrame([row],columns=FEATURES)
    risk=PIPELINE.predict(X)[0]
    probabilities=PIPELINE.predict_proba(X)[0]
    classes=list(PIPELINE.classes_)
    prob_map={c:round(float(p),4) for c,p in zip(classes,probabilities)}
    indicators=_condition_indicators(answers)
    # Educational wellness score is a simple presentation score; the ML model is the risk classifier.
    score=max(0,min(100,round(100 - prob_map.get('High',0)*55 - prob_map.get('Medium',0)*25)))
    recs=["This assessment is educational only and is not a medical diagnosis."]
    if risk=='High': recs.append("Consider discussing your health concerns with a qualified healthcare professional.")
    elif risk=='Medium': recs.append("Consider healthy lifestyle improvements and discuss persistent concerns with a qualified professional.")
    else: recs.append("Continue healthy habits and use the result as an educational risk indicator, not a diagnosis.")
    return {'conditions':indicators,'topCondition':indicators[0]['name'] if indicators else 'General Wellness Assessment','riskLevel':risk,'healthScore':score,'recommendations':recs,'modelType':'Random Forest (trained ML)','modelVersion':MODEL_VERSION,'riskProbabilities':prob_map}
