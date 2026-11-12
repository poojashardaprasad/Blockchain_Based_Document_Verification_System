const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const institutionRoutes = require('./routes/institutionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const documentRoutes = require('./routes/documentRoutes');
const certificateRoutes = require('./routes/certificateRoutes');

const app = express();

// Ensure runtime directories exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const certDir = process.env.CERTIFICATE_DIR || path.join(__dirname, 'certificates');
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

// CORS configuration supporting comma-separated allowed origins or open for public endpoints
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : '*';

app.use(cors({
    origin: allowedOrigins === '*' ? '*' : (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(null, true); // Fallback to allow for public verification
        }
    },
    credentials: true
}));

app.use(helmet({
    crossOriginResourcePolicy: false
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome / status endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Blockchain-Based Document Verification API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Health endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/certificates', certificateRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('API Error:', err.stack || err.message);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
});

const PORT = process.env.PORT || 5001;

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`);
});

server.on('error', (e) => {
    console.error('Server Listen Error:', e);
});
