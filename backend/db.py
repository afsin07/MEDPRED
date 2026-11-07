import os
import mysql.connector
from mysql.connector import pooling

# Path to the Aiven CA certificate. Defaults to ca.pem sitting next to this
# file (i.e. backend/ca.pem), which is where Aiven's downloaded cert goes.
# Set DB_SSL_CA to override, or leave DB_SSL_CA="" to disable SSL (e.g. for
# a local MySQL install that doesn't use it).
_DEFAULT_CA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ca.pem")
DB_SSL_CA = os.getenv("DB_SSL_CA", _DEFAULT_CA_PATH)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "medipredict"),
}

# Aiven (and most managed MySQL providers) require SSL. Only attach the CA
# if a real cert file is present on disk, so local dev without SSL still works.
if DB_SSL_CA and os.path.isfile(DB_SSL_CA):
    DB_CONFIG["ssl_ca"] = DB_SSL_CA
    DB_CONFIG["ssl_verify_cert"] = True

_pool = None

def init_database():
    global _pool

    # Connect directly to the configured database. Managed MySQL services such
    # as Aiven already provide the database (defaultdb in this project) and may
    # not grant CREATE DATABASE privileges to the application user.
    _pool = pooling.MySQLConnectionPool(
        pool_name="medipredict_pool",
        pool_size=5,
        **DB_CONFIG,
    )
    conn = get_conn(); cur = conn.cursor()
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
    conn.commit(); cur.close(); conn.close()

def get_conn():
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
    return _pool.get_connection()
