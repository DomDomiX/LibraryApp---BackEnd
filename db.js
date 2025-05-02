const { Pool } = require("pg");

// Konfigurace se načte z .env souboru
const pool = new Pool();

module.exports = pool;
