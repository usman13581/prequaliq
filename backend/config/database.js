require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).username : 'postgres'),
    password: process.env.DB_PASSWORD || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).password : undefined),
    database: process.env.DB_NAME || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.slice(1) : 'prequaliq_db'),
    host: process.env.DB_HOST || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : 'localhost'),
    port: process.env.DB_PORT || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).port : 5432),
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
    username: (process.env.DB_USER && process.env.DB_USER.trim()) || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).username : undefined),
    password: (process.env.DB_PASSWORD && process.env.DB_PASSWORD.trim()) || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).password : undefined),
    database: (process.env.DB_NAME && process.env.DB_NAME.trim()) || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).pathname.slice(1) : undefined),
    host: (process.env.DB_HOST && process.env.DB_HOST.trim()) || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : undefined),
    port: (process.env.DB_PORT && process.env.DB_PORT.trim()) || (process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).port : undefined),
    dialect: 'postgres',
    logging: false
  }
};
