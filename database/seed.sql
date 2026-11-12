USE doc_verify_db;

-- Initial Admin User (Password: admin123)
-- Hash generated using bcrypt (cost 10) for 'admin123'
INSERT INTO users (name, email, password_hash, role) 
VALUES ('System Admin', 'admin@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin');
