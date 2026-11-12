const mysql = require('mysql2');
require('dotenv').config();

const poolConfig = {
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0
};

if (process.env.DATABASE_URL) {
    // Cloud provider connection string (e.g. Aiven, Railway, PlanetScale)
    const url = new URL(process.env.DATABASE_URL);
    poolConfig.host = url.hostname;
    poolConfig.port = Number(url.port) || 3306;
    poolConfig.user = url.username;
    poolConfig.password = url.password;
    poolConfig.database = url.pathname.replace(/^\//, '');
} else {
    poolConfig.host = process.env.DB_HOST || 'localhost';
    poolConfig.port = Number(process.env.DB_PORT) || 3306;
    poolConfig.user = process.env.DB_USER || 'root';
    poolConfig.password = process.env.DB_PASSWORD || '';
    poolConfig.database = process.env.DB_NAME || 'doc_verify_db';
}

// Enable SSL if explicitly configured or when connecting to cloud MySQL
if (process.env.DB_SSL === 'true' || (process.env.NODE_ENV === 'production' && poolConfig.host !== 'localhost' && poolConfig.host !== '127.0.0.1')) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool.promise();
