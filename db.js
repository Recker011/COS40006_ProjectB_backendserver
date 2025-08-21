// db.js
// MySQL connection pool using environment variables
// Requires ca.pem certificate in certs/ directory for Aiven

const path = require("path");
const fs = require("fs");
require('dotenv').config();
const mysql = require("mysql2/promise");

// Read DB configuration from environment variables
const HOST = process.env.DB_HOST || "cos40006-projectb-cleaningdb-eaca.c.aivencloud.com";
const PORT = process.env.DB_PORT || 11316;
const USER = process.env.DB_USER || "avnadmin";
const PASSWORD = process.env.DB_PASSWORD || "AVNS_aEf_73ImCqt_JMyVyAD";
const DATABASE = process.env.DB_NAME || "defaultdb";

// Load SSL certificate for Aiven
const caPath = path.resolve(__dirname, "certs", "ca.pem");
const ca = fs.readFileSync(caPath);

// Create connection pool
const pool = mysql.createPool({
  host: HOST,
  port: PORT,
  user: USER,
  password: PASSWORD,
  database: DATABASE,
  ssl: { ca }, // required by Aiven; verifies server cert with the CA
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Execute a SQL query with parameters
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Object} - Object containing rows array
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return { rows };
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw error;
  }
}

// Test database connection
async function ping() {
  const [rows] = await pool.query('SELECT VERSION()');
  return rows[0]['VERSION()'];
}

// Export pool, query, and ping
module.exports = { pool, query, ping };
