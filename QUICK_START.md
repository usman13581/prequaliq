# Quick Start Guide - Step 3 Onwards

## Step 3: Configure Environment ✅
The `.env` file has been created. You may need to update the database password if your PostgreSQL uses a different password.

**Current settings:**
- Database: `prequaliq_db`
- User: `postgres`
- Password: `your_password` (UPDATE THIS!)

## Step 4: Start PostgreSQL Server

**On macOS (Homebrew):**
```bash
brew services start postgresql@14
# Or if you have a different version:
brew services start postgresql
```

**Check if PostgreSQL is running:**
```bash
pg_isready
```

**If you get connection errors, try:**
```bash
# Check your PostgreSQL user
whoami

# Try connecting with your macOS username
psql postgres
```

## Step 5: Create Database

Once PostgreSQL is running, create the database:

```bash
# Option 1: Using createdb command
createdb prequaliq_db

# Option 2: Using psql
psql postgres -c "CREATE DATABASE prequaliq_db;"

# Option 3: If you need to specify user
psql -U postgres -c "CREATE DATABASE prequaliq_db;"
```

**If you get authentication errors:**
- On macOS, PostgreSQL might use your macOS username instead of 'postgres'
- Update `backend/.env` with your actual PostgreSQL username
- Or create a postgres user: `createuser -s postgres`

## Step 6: Update .env File

Edit `backend/.env` and update these values:

```env
DB_USER=your_macos_username  # or 'postgres' if you created that user
DB_PASSWORD=your_postgres_password  # leave empty if no password
```

**Common macOS PostgreSQL setup:**
- User: Your macOS username (e.g., `muhammadusmanfarooqmuhammadusman`)
- Password: Usually empty or your macOS password
- Host: `localhost`
- Port: `5432`

## Step 7: Install Dependencies

```bash
# From project root
npm run install-all
```

## Step 8: Run Database Migrations

```bash
cd backend
npm run migrate
```

## Step 9: Seed CPV Codes

```bash
cd backend
npm run seed
```

## Step 10: Create Admin User

```bash
cd backend
npm run create-admin
```

Or with custom credentials:
```bash
npm run create-admin admin@example.com AdminPassword123 Admin User
```

## Step 11: Start the Application

```bash
# From project root
npm run dev
```

This will start:
- Backend API: http://localhost:5000
- Frontend: http://localhost:5173

## Troubleshooting

### PostgreSQL Connection Issues

1. **Check PostgreSQL is running:**
   ```bash
   brew services list | grep postgresql
   ```

2. **Start PostgreSQL:**
   ```bash
   brew services start postgresql@14
   ```

3. **Find your PostgreSQL user:**
   ```bash
   psql postgres -c "SELECT current_user;"
   ```

4. **Test connection:**
   ```bash
   psql -d postgres
   ```

### Database Creation Issues

If `createdb` doesn't work, use psql:
```bash
psql postgres
```
Then in psql prompt:
```sql
CREATE DATABASE prequaliq_db;
\q
```

### Migration Issues

If migrations fail:
1. Check database connection in `.env`
2. Ensure database exists
3. Check user has CREATE privileges
4. Try: `psql prequaliq_db -c "SELECT version();"`

### Port Already in Use

If port 5000 or 5173 is in use:
- Change `PORT` in `backend/.env`
- Change port in `frontend/vite.config.ts`

## Next Steps After Setup

1. **Login as Admin:**
   - Go to http://localhost:5173
   - Login with admin credentials
   - Create suppliers and procuring entities

2. **Test Supplier Flow:**
   - Register a supplier account
   - Complete profile
   - Upload documents
   - Wait for admin approval

3. **Test Procuring Entity Flow:**
   - Create procuring entity (via admin)
   - Create questionnaires
   - Search suppliers
