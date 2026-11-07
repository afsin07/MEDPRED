-- =============================================================
-- MediPredict MySQL Database Schema
-- Target Database: medipredict
-- Compatible with Express + MySQL (mysql2) backend
-- =============================================================

CREATE DATABASE IF NOT EXISTS medipredict;
USE medipredict;

-- -------------------------------------------------------------
-- Table Structure: users
-- Stores registered account information with bcrypt hashed passwords
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Table Structure: health_reports
-- Stores health assessment inputs & generated predictions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_reports (
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
    
    CONSTRAINT fk_health_reports_user 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
