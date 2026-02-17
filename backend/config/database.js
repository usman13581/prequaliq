require('dotenv').config();

// Helper to safely parse DATABASE_URL
function parseDatabaseUrl() {
  if (!process.env.DATABASE_URL) return null;
  try {
    return new URL(process.env.DATABASE_URL);
  } catch (e) {
    console.warn('Invalid DATABASE_URL, using individual DB config variables instead');
    return null;
  }
}

const dbUrl = parseDatabaseUrl();

module.exports = {
  development: {
    username: process.env.DB_USER || (dbUrl ? dbUrl.username : 'postgres'),
    password: process.env.DB_PASSWORD || (dbUrl ? dbUrl.password : undefined),
    database: process.env.DB_NAME || (dbUrl ? dbUrl.pathname.slice(1) : 'prequaliq_db'),
    host: process.env.DB_HOST || (dbUrl ? dbUrl.hostname : 'localhost'),
    port: process.env.DB_PORT || (dbUrl ? dbUrl.port : 5432),
    dialect: 'postgres',
    logging: console.log
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME_TEST || 'prequaliq_db_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres'
  },
  production: {
    username: (process.env.DB_USER && process.env.DB_USER.trim()) || (dbUrl ? dbUrl.username : undefined),
    password: (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim()) || (dbUrl ? dbUrl.password : undefined),
    database: (process.env.DB_NAME && process.env.DB_NAME.trim()) || (dbUrl ? dbUrl.pathname.slice(1) : undefined),
    host: (process.env.DB_HOST && process.env.DB_HOST.trim()) || (dbUrl ? dbUrl.hostname : undefined),
    port: (process.env.DB_PORT && process.env.DB_PORT.trim()) || (dbUrl ? dbUrl.port : undefined),
    dialect: 'postgres',
    logging: false
  }
};
