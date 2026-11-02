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

function databaseNameFromUrl(dbUrl) {
  if (!dbUrl?.pathname) return undefined;
  // pathname is "/dbname" — strip leading slash and any query leftover
  return decodeURIComponent(dbUrl.pathname.replace(/^\//, '').split('?')[0] || '') || undefined;
}

const dbUrl = parseDatabaseUrl();

module.exports = {
  development: {
    username: process.env.DB_USER || (dbUrl ? dbUrl.username : 'postgres'),
    password: process.env.DB_PASSWORD || (dbUrl ? dbUrl.password : undefined),
    database: process.env.DB_NAME || (dbUrl ? databaseNameFromUrl(dbUrl) : 'prequaliq_db'),
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
  // Railway / hosted: when DATABASE_URL is set, it is the source of truth.
  // Do NOT let stale DB_USER/DB_PASSWORD override it (common deploy auth failure).
  production: dbUrl
    ? {
        // URL() already percent-decodes username/password
        username: dbUrl.username || undefined,
        password: dbUrl.password || undefined,
        database: databaseNameFromUrl(dbUrl),
        host: dbUrl.hostname,
        port: dbUrl.port || 5432,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
          ssl: process.env.DB_SSL === 'false'
            ? false
            : { require: true, rejectUnauthorized: false }
        }
      }
    : {
        username: (process.env.DB_USER && process.env.DB_USER.trim()) || undefined,
        password: (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim()) || undefined,
        database: (process.env.DB_NAME && process.env.DB_NAME.trim()) || undefined,
        host: (process.env.DB_HOST && process.env.DB_HOST.trim()) || undefined,
        port: (process.env.DB_PORT && process.env.DB_PORT.trim()) || undefined,
        dialect: 'postgres',
        logging: false
      }
};
