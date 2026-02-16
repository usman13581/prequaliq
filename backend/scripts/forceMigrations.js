require('dotenv').config();
const db = require('../models');

async function forceMigrations() {
  try {
    console.log('Force running migrations...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Check if SequelizeMeta table exists and has records
    try {
      const [results] = await db.sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
      console.log(`Found ${results.length} migration records in SequelizeMeta`);
      
      if (results.length > 0) {
        console.log('Clearing SequelizeMeta to force re-run migrations...');
        await db.sequelize.query('DELETE FROM "SequelizeMeta"');
        console.log('✓ SequelizeMeta cleared');
      }
    } catch (e) {
      console.log('SequelizeMeta table does not exist or is empty, proceeding...');
    }
    
    // Now run migrations
    const { execSync } = require('child_process');
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    
    execSync('npx sequelize-cli db:migrate', {
      stdio: 'inherit',
      env: process.env
    });
    
    console.log('✓ Migrations completed successfully');
    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    await db.sequelize.close();
    process.exit(1);
  }
}

forceMigrations();
