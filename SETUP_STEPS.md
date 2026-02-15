# Setup Steps - From Step 3 Onwards

## ✅ Step 3: Environment Configuration - COMPLETED
The `.env` file has been created at `backend/.env`. 

**Important:** You need to update the database password if your PostgreSQL uses a password.

Edit `backend/.env` and update:
```env
DB_PASSWORD=your_actual_password  # Leave empty if no password
DB_USER=your_postgres_username      # Usually your macOS username or 'postgres'
```

## Step 4: Start PostgreSQL Server

**First, start PostgreSQL:**
```bash
brew services start postgresql@14
# Or if you have a different version:
brew services start postgresql
```

**Verify it's running:**
```bash
pg_isready
```

## Step 5: Run Database Setup Script

I've created an automated setup script for you. Run:

```bash
./setup-database.sh
```

This script will:
1. Check if PostgreSQL is running
2. Create the database `prequaliq_db`
3. Run all migrations
4. Seed CPV codes
5. Create an admin user

**OR do it manually:**

### 5a. Create Database
```bash
createdb prequaliq_db
# Or if that doesn't work:
psql postgres -c "CREATE DATABASE prequaliq_db;"
```

### 5b. Run Migrations
```bash
cd backend
npm run migrate
```

### 5c. Seed CPV Codes
```bash
cd backend
npm run seed
```

### 5d. Create Admin User
```bash
cd backend
npm run create-admin
# Or with custom credentials:
npm run create-admin admin@example.com AdminPassword123 Admin User
```

## Step 6: Start the Application

From the project root:
```bash
npm run dev
```

This starts:
- **Backend API:** http://localhost:5000
- **Frontend:** http://localhost:5173

## Step 7: Login

1. Open http://localhost:5173 in your browser
2. Login with admin credentials:
   - Email: `admin@prequaliq.com`
   - Password: `admin123`
   - (Or whatever you set during admin creation)

## Troubleshooting

### PostgreSQL Won't Start
```bash
# Check status
brew services list | grep postgresql

# Start it
brew services start postgresql@14

# Check logs if it fails
brew services info postgresql@14
```

### Database Connection Errors

**Find your PostgreSQL username:**
```bash
whoami
# Use this as DB_USER in .env if 'postgres' doesn't work
```

**Test connection:**
```bash
psql postgres
# If this works, your username is correct
```

**Update .env with correct credentials:**
- `DB_USER` = your macOS username (usually)
- `DB_PASSWORD` = leave empty if no password, or your PostgreSQL password

### Migration Errors

1. Check `.env` file has correct database credentials
2. Ensure database exists: `psql -l | grep prequaliq_db`
3. Check user has permissions: `psql prequaliq_db -c "SELECT 1;"`

### Port Already in Use

If ports 5000 or 5173 are in use:
- Change `PORT` in `backend/.env`
- Change port in `frontend/vite.config.ts` → `server.port`

## Quick Reference

**All commands from project root:**

```bash
# Start PostgreSQL
brew services start postgresql@14

# Setup database (automated)
./setup-database.sh

# Or manual setup
createdb prequaliq_db
cd backend && npm run migrate && npm run seed && npm run create-admin

# Start application
npm run dev

# Stop application
Ctrl+C

# Stop PostgreSQL
brew services stop postgresql@14
```

## Next Steps After Setup

1. **Login as Admin** → Create suppliers and procuring entities
2. **Test Supplier Flow** → Register → Complete profile → Upload docs → Get approved
3. **Test Procuring Entity Flow** → Create questionnaires → Search suppliers
4. **Create Announcements** → CPV-based targeting
