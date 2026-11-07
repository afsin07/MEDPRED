import json
import os
from functools import wraps
from datetime import timedelta

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request, session, redirect
from flask_cors import CORS
import bcrypt

from db import init_database, get_conn
from ml.model import predict

app = Flask(__name__)

# Cross-site session cookies are required when the Vercel frontend
# communicates with the separately hosted Render backend.
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "true").lower() == "true"
SESSION_COOKIE_SAMESITE = os.getenv(
    "SESSION_COOKIE_SAMESITE",
    "None" if SESSION_COOKIE_SECURE else "Lax"
)

app.config.update(
    SECRET_KEY=os.getenv("SESSION_SECRET", "change-me-in-env"),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE=SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE=SESSION_COOKIE_SECURE,
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24),
)

default_origins = (
    "http://127.0.0.1:3000,"
    "http://localhost:3000,"
    "https://medipredict-henna.vercel.app,"
    "https://medipredict-git-master-medipredict.vercel.app,"
    "https://medipredict-mdr3085kk-medipredict.vercel.app"
)
origins = [
    x.strip()
    for x in os.getenv("CORS_ORIGINS", default_origins).split(",")
    if x.strip()
]
CORS(app, supports_credentials=True, origins=origins)

MODEL_INFO = {"loaded": True, "type": "random-forest-health-risk-classifier", "version": "rf-educational-1.0", "purpose": "educational health-risk assessment only", "dataset": "synthetic-educational"}
DB_READY = False
try:
    init_database()
    DB_READY = True
    print("[OK] MySQL connected and schema verified")
except Exception as exc:
    print(f"[WARN] MySQL unavailable: {exc}")

print("[OK] Prediction service loaded: Random Forest educational risk classifier")


def login_required(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if not session.get("user"):
            return jsonify(success=False, message="Login required"), 401
        return fn(*args, **kwargs)
    return wrapped


def db_json(value, fallback):
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value) if value else fallback
    except Exception:
        return fallback

@app.get("/api/health")
def health():
    return jsonify(success=True, status="running", project="MediPredict", backend="Flask", model=MODEL_INFO, database="connected" if DB_READY else "unavailable")

@app.get("/api/model")
def model_info():
    return jsonify(success=True, model=MODEL_INFO)

@app.post("/api/predict")
def api_predict():
    if not request.is_json:
        return jsonify(success=False, error="Request Content-Type must be application/json"), 400
    data = request.get_json(silent=True)
    if data is None:
        return jsonify(success=False, error="Invalid or empty JSON body"), 400
    try:
        result = predict(data)
    except ValueError as exc:
        return jsonify(success=False, error=str(exc)), 400
    except Exception as exc:
        app.logger.exception("Prediction failure")
        return jsonify(success=False, error="Prediction service failed"), 500
    return jsonify(success=True, prediction=result, model=MODEL_INFO)

@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    name, email, password = str(data.get("name", "")).strip(), str(data.get("email", "")).strip().lower(), str(data.get("password", ""))
    if not name or not email or not password:
        return jsonify(success=False, message="Name, email, and password are required"), 400
    if len(password) < 6:
        return jsonify(success=False, message="Password must be at least 6 characters long"), 400
    if not DB_READY: return jsonify(success=False, message="Database unavailable"), 503
    conn=get_conn(); cur=conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id FROM users WHERE email=%s LIMIT 1", (email,))
        if cur.fetchone(): return jsonify(success=False, message="An account with this email already exists."), 400
        hashed=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        cur.execute("INSERT INTO users (name,email,password) VALUES (%s,%s,%s)", (name,email,hashed)); conn.commit()
        return jsonify(success=True, message="Registration successful", userId=cur.lastrowid), 201
    finally: cur.close(); conn.close()

@app.post("/api/login")
def login():
    data=request.get_json(silent=True) or {}; email=str(data.get("email", "")).strip().lower(); password=str(data.get("password", ""))
    if not email or not password: return jsonify(success=False, message="Email and password are required"), 400
    if not DB_READY: return jsonify(success=False, message="Database unavailable"), 503
    conn=get_conn(); cur=conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id,name,email,password FROM users WHERE email=%s LIMIT 1", (email,)); user=cur.fetchone()
        if not user or not bcrypt.checkpw(password.encode(), user["password"].encode()): return jsonify(success=False, message="Invalid email or password"), 401
        session.permanent=True; session["user"]={"id":user["id"],"name":user["name"],"email":user["email"]}
        return jsonify(success=True, message="Login successful", user=session["user"])
    finally: cur.close(); conn.close()

@app.get("/api/session")
def api_session():
    user=session.get("user")
    if not user: return jsonify(success=False, loggedIn=False, message="No active session"), 401
    return jsonify(success=True, loggedIn=True, user=user)

@app.get("/api/me")
@login_required
def me(): return jsonify(success=True, user=session["user"])

@app.post("/api/logout")
def logout():
    session.clear(); return jsonify(success=True, message="Logout successful")

@app.get("/api/reports")
@login_required
def reports():
    if not DB_READY: return jsonify(success=False,message="Database unavailable"),503
    conn=get_conn(); cur=conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id,user_id AS userId,report_date AS date,answers,conditions,top_condition AS topCondition,risk_level AS riskLevel,health_score AS healthScore,recommendations,report_date AS createdAt FROM health_reports WHERE user_id=%s ORDER BY report_date DESC", (session["user"]["id"],))
        rows=cur.fetchall()
        for r in rows:
            r["answers"]=db_json(r["answers"],{}); r["conditions"]=db_json(r["conditions"],[]); r["recommendations"]=db_json(r["recommendations"],[])
        return jsonify(success=True,reports=rows)
    finally: cur.close(); conn.close()

@app.get("/api/reports/<int:report_id>")
@login_required
def report(report_id):
    if not DB_READY: return jsonify(success=False,message="Database unavailable"),503
    conn=get_conn(); cur=conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id,user_id AS userId,report_date AS date,answers,conditions,top_condition AS topCondition,risk_level AS riskLevel,health_score AS healthScore,recommendations,report_date AS createdAt FROM health_reports WHERE id=%s AND user_id=%s LIMIT 1", (report_id,session["user"]["id"]))
        r=cur.fetchone()
        if not r: return jsonify(success=False,message="Report not found"),404
        r["answers"]=db_json(r["answers"],{}); r["conditions"]=db_json(r["conditions"],[]); r["recommendations"]=db_json(r["recommendations"],[])
        return jsonify(success=True,report=r)
    finally: cur.close(); conn.close()


def report_payload(data):
    report=data.get("report") if isinstance(data,dict) else None
    if not report or not isinstance(report,dict): raise ValueError("Report payload is required")
    return report

@app.post("/api/reports")
@login_required
def create_report():
    if not DB_READY: return jsonify(success=False,message="Database unavailable"),503
    try: r=report_payload(request.get_json(silent=True) or {})
    except ValueError as exc: return jsonify(success=False,message=str(exc)),400
    conn=get_conn(); cur=conn.cursor()
    try:
        cur.execute("INSERT INTO health_reports (user_id,report_date,answers,conditions,top_condition,risk_level,health_score,recommendations) VALUES (%s,NOW(),%s,%s,%s,%s,%s,%s)", (session["user"]["id"],json.dumps(r.get("answers",{})),json.dumps(r.get("conditions",[])),r.get("topCondition","General Assessment"),r.get("riskLevel","Low"),int(r.get("healthScore",100)),json.dumps(r.get("recommendations",[]))))
        conn.commit()
        report_id=cur.lastrowid
        return jsonify(success=True,message="Report saved successfully",reportId=report_id),201
    finally: cur.close(); conn.close()

@app.put("/api/reports/<int:report_id>")
@login_required
def update_report(report_id):
    if not DB_READY: return jsonify(success=False,message="Database unavailable"),503
    try: r=report_payload(request.get_json(silent=True) or {})
    except ValueError as exc: return jsonify(success=False,message=str(exc)),400
    conn=get_conn(); cur=conn.cursor()
    try:
        cur.execute("UPDATE health_reports SET answers=%s,conditions=%s,top_condition=%s,risk_level=%s,health_score=%s,recommendations=%s,updated_at=NOW() WHERE id=%s AND user_id=%s", (json.dumps(r.get("answers",{})),json.dumps(r.get("conditions",[])),r.get("topCondition","General Assessment"),r.get("riskLevel","Low"),int(r.get("healthScore",100)),json.dumps(r.get("recommendations",[])),report_id,session["user"]["id"]))
        conn.commit()
        if cur.rowcount==0: return jsonify(success=False,message="Report not found or unauthorized"),404
        return jsonify(success=True,message="Report updated successfully")
    finally: cur.close(); conn.close()

@app.delete("/api/reports/<int:report_id>")
@login_required
def delete_report(report_id):
    if not DB_READY: return jsonify(success=False,message="Database unavailable"),503
    conn=get_conn(); cur=conn.cursor()
    try:
        cur.execute("DELETE FROM health_reports WHERE id=%s AND user_id=%s", (report_id,session["user"]["id"])); conn.commit()
        if cur.rowcount==0: return jsonify(success=False,message="Report not found"),404
        return jsonify(success=True,message="Report deleted successfully")
    finally: cur.close(); conn.close()

@app.get("/api/admin/users")
@login_required
def admin_users():
    if not DB_READY: return jsonify(success=False,message="Database unavailable"),503
    conn=get_conn(); cur=conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT id,name,email,created_at FROM users ORDER BY created_at DESC"); rows=cur.fetchall(); return jsonify(success=True,count=len(rows),users=rows)
    finally: cur.close(); conn.close()

@app.get("/api/admin/reports")
@login_required
def admin_reports():
    if not DB_READY: return jsonify(success=False,message="Database unavailable"),503
    conn=get_conn(); cur=conn.cursor(dictionary=True)
    try:
        cur.execute("SELECT hr.id,hr.user_id, u.name AS userName,u.email AS userEmail,hr.top_condition,hr.risk_level,hr.health_score,hr.report_date AS created_at FROM health_reports hr LEFT JOIN users u ON hr.user_id=u.id ORDER BY hr.report_date DESC"); rows=cur.fetchall(); return jsonify(success=True,count=len(rows),reports=rows)
    finally: cur.close(); conn.close()

@app.errorhandler(404)
def not_found(_):
    return jsonify(success=False,error="Endpoint not found"),404

if __name__ == "__main__":
    port=int(os.getenv("PORT","5000"))
    print("="*60)
    print("MediPredict Flask Backend")
    print(f"API: http://127.0.0.1:{port}")
    print("Prediction service: READY")
    print("="*60)
    app.run(host="0.0.0.0",port=port,debug=os.getenv("FLASK_DEBUG","false").lower()=="true")
