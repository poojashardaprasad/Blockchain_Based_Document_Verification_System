
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const institutionRoutes = require('./routes/institutionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const documentRoutes = require('./routes/documentRoutes');

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
    console.error('UNHANDLED REJECTION:', reason);
    process.exit(1);
});


const app = express();

// Middleware
console.log('Initializing middleware...');
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('Initializing routes...');
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});
console.log('Routes initialized.');

// Health endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = 5001;

console.log(`Attempting to listen on port ${PORT}...`);
const server = app.listen(PORT, () => {
    console.log(`Debug Server running on port ${PORT}`);
    console.log('PID:', process.pid);
});

server.on('error', (e) => {
    console.error('Server Error:', e);
});

