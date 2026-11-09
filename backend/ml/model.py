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
        recs.append("Doctor Visit Recommended: Your health answers show several risk factors. We recommend visiting a doctor soon to check your vitals and discuss how you are feeling.")
    elif risk == 'Medium':
        recs.append("Healthy Lifestyle Changes: Some moderate risk factors were found. Making a few positive changes to your diet, sleep, and daily movement over the next month or two will help protect your health.")
    else:
        recs.append("Keep Up the Good Work: Your health profile looks good with low immediate risk. Keep up your healthy daily habits and remember to get routine annual check-ups.")

    # 2. Blood Pressure Guidance
    bp = a.get("bloodPressure", "normal")
    if bp == "high":
        recs.append("Blood Pressure: Your reported blood pressure is high. Cut back on salty and packaged snacks, eat potassium-rich foods (like bananas and spinach), and check your blood pressure regularly.")
    elif bp == "low":
        recs.append("Blood Pressure: Your reported blood pressure is low. Drink plenty of water throughout the day and stand up slowly from sitting or lying down to avoid dizziness.")
    else:
        recs.append("Blood Pressure: Your blood pressure is in a healthy range. Keep it strong by getting at least 30 minutes of brisk walking or exercise most days.")

    # 3. Blood Sugar & Metabolic Health
    sugar = a.get("bloodSugar", "normal")
    if sugar == "high":
        recs.append("Blood Sugar: Your reported blood sugar is high. Cut down on sweet drinks, sugary treats, and white bread. Taking a quick 10-minute walk right after meals helps lower sugar naturally.")
    elif sugar == "low":
        recs.append("Blood Sugar: Your reported blood sugar is low. Eat balanced meals at regular times with whole grains and healthy snacks to keep your energy steady.")
    else:
        recs.append("Blood Sugar: Your blood sugar is normal. Keep it steady by eating wholesome meals and avoiding sugary drinks.")

    # 4. Sleep & Recovery
    sleep = float(a.get("sleepHours", 7))
    if sleep < 6:
        recs.append("Sleep: You reported getting less than 6 hours of sleep. Try to get 7 to 8 hours in a quiet, dark bedroom, and put your phone away 45 minutes before bed.")
    elif sleep > 9:
        recs.append("Sleep: You sleep more than 9 hours. If you still wake up feeling tired during the day, make sure your bedroom is quiet, dark, and comfortable.")
    else:
        recs.append("Sleep: Your sleep time (7–9 hours) is in the ideal range. Getting outside for morning sunlight will help you maintain this good sleep rhythm.")

    # 5. Stress & Relaxation
    stress = float(a.get("stressLevel", 5))
    if stress >= 7:
        recs.append("Stress: You reported high stress. Take a few minutes each day for slow, deep breathing (breathe in for 4 seconds, hold for 7, breathe out for 8) to help calm your body down.")
    elif stress >= 5:
        recs.append("Stress: Take short 5-minute breathers during your workday to stretch, walk around, and prevent stress from building up.")
    else:
        recs.append("Stress: Your stress is well-managed. Continue taking time for yourself and doing activities you enjoy.")

    # 6. Physical Activity & Movement
    activity = a.get("activity", "moderate")
    if activity == "sedentary":
        recs.append("Daily Movement: Try not to sit for hours at a time. Stand up every 45 minutes and aim for a 20 to 30-minute brisk walk every day.")
    elif activity == "light":
        recs.append("Daily Movement: Build on your daily routine by adding 30 minutes of walking, cycling, or swimming most days, plus simple bodyweight exercises.")
    else:
        recs.append("Daily Movement: You have a great exercise foundation. Keep up regular movement and include simple strength exercises (like squats or push-ups) twice a week.")

    # 7. Food & Nutrition
    diet = a.get("diet", "balanced")
    if diet == "highSugarFat":
        recs.append("Food Habits: You reported eating a lot of sweet or fatty foods. Try swapping fried snacks and sugary treats for fresh fruits, nuts, and home-cooked meals.")
    elif diet == "irregular":
        recs.append("Food Habits: Try to eat your meals around the same time every day. This keeps your energy steady and helps digestion.")
    else:
        recs.append("Food Habits: Great job eating a balanced diet! Keep enjoying a colorful mix of vegetables, fruits, and whole foods.")

    # 8. Modifiable Substance Factors
    smoking = a.get("smoking", "no")
    if smoking in ("yes", "occasionally"):
        recs.append("Smoking: Quitting or cutting back on smoking quickly protects your heart and helps you breathe much easier.")

    alcohol = a.get("alcohol", "no")
    if alcohol == "frequent":
        recs.append("Alcohol: If you drink frequently, try to have at least 3 or 4 alcohol-free days each week to give your body and liver a rest.")

    # 9. Symptom Alerts
    symptoms = set(a.get("symptoms") or [])
    if symptoms & {"chestPain", "shortnessOfBreath"}:
        recs.append("⚠️ Important Alert: Chest pain or trouble breathing can be serious. Please see a doctor or visit an urgent care center promptly.")
    elif symptoms & {"frequentUrination", "excessiveThirst", "blurredVision"}:
        recs.append("Notice: Frequent urination or constant thirst can be signs of high blood sugar. Consider asking your doctor for a routine blood test.")
    elif symptoms & {"fatigue", "dizziness", "headache"}:
        recs.append("Notice: Frequent tiredness or headaches often come from not drinking enough water or missing sleep. Drink 8–10 glasses of water daily and rest well.")

    # 10. Educational Disclaimer
    recs.append("Educational Note: This assessment is for health awareness and does not replace medical advice or diagnosis from a doctor.")

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
