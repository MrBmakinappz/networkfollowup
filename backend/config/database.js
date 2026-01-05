// Database Configuration
// PostgreSQL connection using pg library
// Simple connection without tenant logic

const { Pool } = require('pg');
const { log, error } = require('../utils/logger');

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
    error('❌ DATABASE_URL is not set in environment variables');
    throw new Error('DATABASE_URL is required');
}

// Create PostgreSQL connection pool
// Optimized for production performance and Railway deployment
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 30000, // 30 seconds - increased for Railway/Supabase
    idleTimeoutMillis: 30000,
    max: 10, // Reduced pool size for Railway
    min: 2, // Minimum connections
    allowExitOnIdle: false, // Keep pool alive
    // Ensure we use the public schema (default)
    // No tenant switching or schema manipulation
});

// Test connection
pool.on('connect', () => {
    log('✅ Database connected successfully');
});

pool.on('error', (err) => {
    error('❌ Unexpected database error:', err);
    process.exit(-1);
});

// Helper function to execute queries
// Simple queries without tenant logic - uses public schema by default
const query = async (text, params) => {
    const start = Date.now();
    try {
        // Ensure we're using public schema (default)
        // No SET search_path or tenant switching
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
        return res;
    } catch (err) {
        error('Database query error:', err.message);
        error('Query:', text.substring(0, 200));
        throw err;
    }
};

// Helper function to get a client from the pool
const getClient = async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Set a timeout of 5 seconds
    const timeout = setTimeout(() => {
        error('A client has been checked out for more than 5 seconds!');
    }, 5000);
    
    // Monkey patch the query method to keep track of the last query executed
    client.query = (...args) => {
        client.lastQuery = args;
        return query.apply(client, args);
    };
    
    // Monkey patch the release method to clear timeout
    client.release = () => {
        clearTimeout(timeout);
        client.query = query;
        client.release = release;
        return release.apply(client);
    };
    
    return client;
};

module.exports = {
    query,
    getClient,
    pool
};
