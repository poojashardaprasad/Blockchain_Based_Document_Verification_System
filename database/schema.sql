CREATE DATABASE IF NOT EXISTS doc_verify_db;
USE doc_verify_db;

-- Institutions Table
CREATE TABLE IF NOT EXISTS institutions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'uploader', 'verifier') NOT NULL,
    institution_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
);

-- Institution Requests Table (New)
CREATE TABLE IF NOT EXISTS institution_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uploader_id INT NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    institution_address TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rejection_reason TEXT NULL,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uploader_id INT NOT NULL,
    institution_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_hash CHAR(66) NOT NULL, -- SHA-256 usually 64 chars, 66 for 0x prefix
    tx_hash CHAR(66) NULL,
    block_number BIGINT NULL,
    status ENUM('active', 'revoked') DEFAULT 'active',
    expiry_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploader_id) REFERENCES users(id),
    FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

-- Revoked Documents Table
CREATE TABLE IF NOT EXISTS revoked_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    reason TEXT NOT NULL,
    revoked_by INT NOT NULL,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (revoked_by) REFERENCES users(id)
);

-- Verifications Table
CREATE TABLE IF NOT EXISTS verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doc_id INT NULL, -- Can be null if verifying an external file not in DB? No, usually checking against DB.
    verifier_id INT NULL,
    uploaded_hash CHAR(66) NOT NULL,
    stored_hash CHAR(66) NULL,
    result ENUM('valid', 'invalid') NOT NULL,
    verifier_ip VARCHAR(45) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE SET NULL,
    FOREIGN KEY (verifier_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    user_id INT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
