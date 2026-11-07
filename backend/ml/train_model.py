"""Retrain the bundled MediPredict Random Forest on synthetic educational data."""
from pathlib import Path
import random, json
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import joblib

ROOT=Path(__file__).resolve().parents[2]; DATA=ROOT/"data"; ML=Path(__file__).resolve().parent
random.seed(42); N=6000
symptoms=['fever','cough','headache','fatigue','dizziness','chestPain','shortnessOfBreath','frequentUrination','excessiveThirst','blurredVision','weightLoss','soreThroat','runnyNose','nausea']; conditions=['hypertension','diabetes','asthma','heartDisease']
rows=[]
for _ in range(N):
 bp=random.choices(['low','normal','high'],[.12,.63,.25])[0]; sugar=random.choices(['low','normal','high'],[.08,.70,.22])[0]; sleep=round(random.uniform(4,10),1); stress=round(random.uniform(0,10),1); smoking=random.choices(['no','occasionally','yes'],[.68,.20,.12])[0]; alcohol=random.choices(['no','occasional','frequent'],[.62,.27,.11])[0]; activity=random.choices(['sedentary','light','moderate','active'],[.25,.30,.30,.15])[0]; diet=random.choices(['balanced','irregular','highSugarFat'],[.52,.28,.20])[0]
 score={'low':2,'normal':0,'high':22}[bp]+{'low':3,'normal':0,'high':20}[sugar]+max(0,7-sleep)*4+max(0,stress-5)*3+{'no':0,'occasionally':7,'yes':14}[smoking]+{'no':0,'occasional':4,'frequent':10}[alcohol]+{'sedentary':14,'light':7,'moderate':2,'active':0}[activity]+{'balanced':0,'irregular':8,'highSugarFat':12}[diet]
 selected=[]; probs={'hypertension':.05+(.35 if bp=='high' else 0)+(.10 if smoking=='yes' else 0)+(.08 if stress>=7 else 0),'diabetes':.04+(.38 if sugar=='high' else 0)+(.10 if diet=='highSugarFat' else 0),'asthma':.04+(.12 if smoking!='no' else 0),'heartDisease':.02+(.22 if bp=='high' else 0)+(.15 if smoking=='yes' else 0)+(.10 if activity=='sedentary' else 0)}
 for c,p in probs.items():
  if random.random()<min(p,.85): selected.append(c)
 symptom_vals={s:0 for s in symptoms}; symptom_count=0
 for s in symptoms:
  p=.025
  if s in ('chestPain','shortnessOfBreath'): p+=.08 if bp=='high' else .02
  if s in ('frequentUrination','excessiveThirst','blurredVision'): p+=.10 if sugar=='high' else .015
  if s in ('headache','dizziness','fatigue'): p+=.04 if stress>=7 or sleep<=5 else .015
  if s in ('cough','fever','soreThroat','runnyNose'): p+=.08 if random.random()<.18 else 0
  if random.random()<min(p,.35): symptom_vals[s]=1; symptom_count+=1
 score += len(selected)*7 + symptom_count*2.5 + random.gauss(0,6)
 risk='Low' if score<25 else ('Medium' if score<50 else 'High')
 row={'bloodPressure':bp,'bloodSugar':sugar,'sleepHours':sleep,'stressLevel':stress,'smoking':smoking,'alcohol':alcohol,'activity':activity,'diet':diet,'symptomCount':symptom_count,'existingConditionCount':len(selected),'riskLevel':risk}; row.update({f'symptom_{s}':v for s,v in symptom_vals.items()}); row.update({f'condition_{c}':int(c in selected) for c in conditions}); rows.append(row)
df=pd.DataFrame(rows); DATA.mkdir(exist_ok=True); df.to_csv(DATA/'health_risk_training_dataset.csv',index=False)
features=[c for c in df.columns if c!='riskLevel']; cat=['bloodPressure','bloodSugar','smoking','alcohol','activity','diet']; num=[c for c in features if c not in cat]
pre=ColumnTransformer([('cat',OneHotEncoder(handle_unknown='ignore'),cat),('num','passthrough',num)]); clf=RandomForestClassifier(n_estimators=250,max_depth=12,min_samples_leaf=4,class_weight='balanced',random_state=42,n_jobs=-1); pipe=Pipeline([('preprocessor',pre),('model',clf)])
Xtr,Xte,ytr,yte=train_test_split(df[features],df.riskLevel,test_size=.2,random_state=42,stratify=df.riskLevel); pipe.fit(Xtr,ytr); pred=pipe.predict(Xte); acc=accuracy_score(yte,pred); pr,re,f1,_=precision_recall_fscore_support(yte,pred,average='weighted',zero_division=0)
joblib.dump({'pipeline':pipe,'features':features,'model_version':'rf-educational-1.0','training_note':'Synthetic educational data; not clinically validated.'},ML/'health_risk_model.joblib',compress=3)
(ML/'model_metrics.json').write_text(json.dumps({'dataset_rows':N,'accuracy':round(float(acc),4),'weighted_precision':round(float(pr),4),'weighted_recall':round(float(re),4),'weighted_f1':round(float(f1),4),'random_state':42,'model':'RandomForestClassifier','note':'Synthetic educational dataset; metrics are not clinical validation.'},indent=2))
print('Model retrained successfully.')
