import os
from pathlib import Path
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import pooling

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_DEFAULT_CA_PATH = os.path.join(_BACKEND_DIR, "ca.pem")

# Ensure environment variables are loaded immediately
load_dotenv(os.path.join(_BACKEND_DIR, ".env"))
load_dotenv()

def get_db_config():
    host = (os.getenv("DB_HOST") or "mysql-3e442ef2-jsafsinooorojxijwidn-9r493085x.h.aivencloud.com").strip()
    try:
        port = int(os.getenv("DB_PORT") or "26867")
    except (ValueError, TypeError):
        port = 26867
    user = (os.getenv("DB_USER") or "avnadmin").strip()
    password = os.getenv("DB_PASSWORD", "")
    database = (os.getenv("DB_NAME") or "defaultdb").strip()

    config = {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "database": database,
    }

    # Resolve CA path
    raw_ca = os.getenv("DB_SSL_CA", "ca.pem")
    ssl_ca_path = ""
    if raw_ca:
        raw_ca = raw_ca.strip()
        if not os.path.isabs(raw_ca):
            cand = os.path.join(_BACKEND_DIR, raw_ca)
            if os.path.isfile(cand):
                ssl_ca_path = cand
            elif os.path.isfile(raw_ca):
                ssl_ca_path = raw_ca
        elif os.path.isfile(raw_ca):
            ssl_ca_path = raw_ca

    if not ssl_ca_path and os.path.isfile(_DEFAULT_CA_PATH):
        ssl_ca_path = _DEFAULT_CA_PATH

    # Attach SSL verification only for remote hosts (not localhost)
    if host not in ("127.0.0.1", "localhost") and ssl_ca_path and os.path.isfile(ssl_ca_path):
        config["ssl_ca"] = ssl_ca_path
        config["ssl_verify_cert"] = True

    return config

_pool = None

def init_database():
    global _pool

    config = get_db_config()
    pool_name = "medipredict_pool"

    # Reset any existing pool registration to avoid PoolError
    if pool_name in pooling._CONNECTION_POOLS:
        try:
            del pooling._CONNECTION_POOLS[pool_name]
        except Exception:
            pass

    _pool = pooling.MySQLConnectionPool(
        pool_name=pool_name,
        pool_size=5,
        **config,
    )
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
    cur.execute("""CREATE TABLE IF NOT EXISTS health_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        report_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        answers JSON NOT NULL,
        conditions JSON NOT NULL,
        top_condition VARCHAR(255) NOT NULL DEFAULT '',
        risk_level VARCHAR(50) NOT NULL DEFAULT 'Low',
        health_score INT NOT NULL DEFAULT 100,
        recommendations JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_health_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci""")
    conn.commit()
    cur.close()
    conn.close()

def get_conn():
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
    conn = _pool.get_connection()
    try:
        conn.ping(reconnect=True, attempts=3, delay=1)
    except Exception:
        pass
    return conn

def ping_db():
    if _pool is None:
        return False
    try:
        conn = _pool.get_connection()
        conn.ping(reconnect=True, attempts=2, delay=1)
        conn.close()
        return True
    except Exception:
        return False
