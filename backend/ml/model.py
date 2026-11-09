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


def _generate_recommendations_and_tips(a, risk, score, indicators):
    recs = []

    # 1. Primary Clinical Direction
    if risk == 'High':
        recs.append("Priority Medical Review: Your composite health profile indicates an elevated risk pattern. We recommend scheduling an in-person evaluation with a licensed physician to review vitals and symptoms.")
    elif risk == 'Medium':
        recs.append("Targeted Preventive Action: Moderate risk factors detected. Proactive lifestyle modifications over the next 30–60 days can significantly lower future health risks.")
    else:
        recs.append("Maintenance & Prevention: Your overall profile indicates low immediate risk. Continue reinforcing healthy daily routines and stay up to date with routine annual screenings.")

    # 2. Blood Pressure Guidance
    bp = a.get("bloodPressure", "normal")
    if bp == "high":
        recs.append("Cardiovascular & BP: Reported blood pressure is elevated. Reduce sodium intake (< 1,500–2,000 mg/day), incorporate potassium-rich foods (bananas, spinach, avocados), and track morning/evening BP readings.")
    elif bp == "low":
        recs.append("Blood Pressure: Reported blood pressure is low. Stay well hydrated, ensure adequate dietary electrolyte balance, and rise slowly from sitting or lying positions.")
    else:
        recs.append("Cardiovascular: Optimal blood pressure reported. Sustain cardiovascular endurance with at least 150 minutes of moderate aerobic activity weekly.")

    # 3. Blood Sugar & Metabolic Health
    sugar = a.get("bloodSugar", "normal")
    if sugar == "high":
        recs.append("Metabolic Health: Elevated blood sugar reported. Limit refined carbohydrates and high-fructose beverages; pair complex carbohydrates with dietary fiber and lean protein, and take a 10-minute walk after meals to blunt glucose spikes.")
    elif sugar == "low":
        recs.append("Metabolic Health: Blood sugar reported low. Consume balanced meals at regular intervals with complex carbohydrates and healthy fats to maintain steady plasma glucose.")
    else:
        recs.append("Metabolic Health: Normal blood sugar status. Maintain insulin sensitivity through regular physical exercise and minimal ultra-processed food consumption.")

    # 4. Sleep & Recovery
    sleep = float(a.get("sleepHours", 7))
    if sleep < 6:
        recs.append("Sleep & Recovery: You reported sleeping under 6 hours. Insufficient sleep elevates systemic inflammation and nocturnal blood pressure. Aim for 7–8 hours in a dark, quiet bedroom (18–20°C) with no screens 45 minutes before sleep.")
    elif sleep > 9:
        recs.append("Sleep & Recovery: Prolonged sleep (> 9 hours) paired with daytime tiredness may indicate non-restorative sleep. Consider evaluation for sleep architecture quality or sleep apnea.")
    else:
        recs.append("Sleep Hygiene: Sleep duration is in the recommended range (7–9 hours). Strengthen your circadian rhythm with 10–15 minutes of outdoor sunlight within an hour of waking.")

    # 5. Stress & Autonomic Balance
    stress = float(a.get("stressLevel", 5))
    if stress >= 7:
        recs.append("Stress Management: High stress index reported. Practice daily parasympathetic activation: 4-7-8 diaphragmatic breathing or physiological sighs (2 quick inhales, 1 extended exhale) for 5 minutes twice daily.")
    elif stress >= 5:
        recs.append("Stress Management: Moderate stress levels. Schedule deliberate 5-minute micro-breaks during work and engage in regular outdoor relaxation to buffer cortisol accumulation.")
    else:
        recs.append("Stress Management: Stress is well-managed. Continue healthy mindfulness and social connection habits.")

    # 6. Physical Activity & Movement
    activity = a.get("activity", "moderate")
    if activity == "sedentary":
        recs.append("Physical Fitness: Sedentary lifestyle identified. Start with accessible movement: break prolonged sitting every 45 minutes, and build a routine of 20–30 minutes of daily brisk walking.")
    elif activity == "light":
        recs.append("Physical Fitness: Progress your baseline by adding 30 minutes of moderate aerobic training (cycling, jogging, swimming) 4–5 days per week plus 2 days of bodyweight resistance.")
    else:
        recs.append("Physical Fitness: Great activity foundation. Maintain consistent moderate-to-vigorous exercise and include strength/resistance training to safeguard joint mobility and metabolic mass.")

    # 7. Dietary Quality & Nutrition
    diet = a.get("diet", "balanced")
    if diet == "highSugarFat":
        recs.append("Nutritional Quality: High intake of processed sugars and saturated fats reported. Swap fried and ultra-processed snacks for antioxidant-rich fruits, raw nuts, seeds, and extra virgin olive oil.")
    elif diet == "irregular":
        recs.append("Nutritional Consistency: Irregular meal patterns disrupt metabolic rhythms and insulin response. Set consistent daily meal windows to stabilize energy and digestive health.")
    else:
        recs.append("Nutritional Quality: Balanced dietary pattern reported. Keep diversifying plant foods (aim for 25+ different plant varieties weekly) to enrich the gut microbiome.")

    # 8. Modifiable Substance Factors
    smoking = a.get("smoking", "no")
    if smoking in ("yes", "occasionally"):
        recs.append("Cardiovascular Risk: Smoking dramatically accelerates arterial stiffness and endothelial damage. Quitting smoking cuts excess coronary heart disease risk by half within 1 year.")

    alcohol = a.get("alcohol", "no")
    if alcohol == "frequent":
        recs.append("Metabolic Recovery: Frequent alcohol consumption disrupts restorative REM sleep, elevates triglycerides, and increases liver workload. Aim for at least 3–4 alcohol-free days weekly.")

    # 9. Symptom Alerts
    symptoms = set(a.get("symptoms") or [])
    if symptoms & {"chestPain", "shortnessOfBreath"}:
        recs.append("⚠️ Critical Symptom Alert: Reported chest discomfort or shortness of breath should be assessed promptly by a healthcare professional, especially if exertion-triggered.")
    elif symptoms & {"frequentUrination", "excessiveThirst", "blurredVision"}:
        recs.append("Symptom Correlation: Frequent urination and increased thirst are recognized indicators for glucose intolerance; consider requesting an HbA1c test from your doctor.")
    elif symptoms & {"fatigue", "dizziness", "headache"}:
        recs.append("Symptom Notice: Persistent fatigue and headaches often correlate with chronic dehydration, electrolyte shifts, or sleep debt. Increase daily water intake (2–2.5L) and monitor duration.")

    # 10. Educational Disclaimer
    recs.append("Educational Note: This assessment is designed for educational health awareness and does not replace medical diagnosis, consultation, or treatment by a licensed physician.")

    return recs


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
    recs=_generate_recommendations_and_tips(answers, risk, score, indicators)
    return {'conditions':indicators,'topCondition':indicators[0]['name'] if indicators else 'General Wellness Assessment','riskLevel':risk,'healthScore':score,'recommendations':recs,'modelType':'Random Forest (trained ML)','modelVersion':MODEL_VERSION,'riskProbabilities':prob_map}
