# Login Troubleshooting Guide

## Issue: Admin Login Failed

### Root Cause: Backend Server Not Running

The backend API server is not running on port 5000, which is why login fails.

## Solution: Start Backend Server

### Step 1: Check if Backend is Running

```bash
curl http://localhost:5000/api/health
```

If you get "Connection refused" or "Failed to connect", the backend is not running.

### Step 2: Start Backend Server

**Option A: From project root (runs both frontend and backend)**
```bash
npm run dev
```

**Option B: Start backend only (recommended for debugging)**
```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
```

### Step 3: Verify Backend is Running

Open a new terminal and test:
```bash
curl http://localhost:5000/api/health
```

Should return:
```json
{"status":"OK","message":"PrequaliQ API is running"}
```

### Step 4: Test Login API

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@prequaliq.com","password":"admin123"}'
```

Should return a JSON response with token and user data.

### Step 5: Try Login Again

1. Make sure backend is running (port 5000)
2. Make sure frontend is running (port 5173)
3. Go to http://localhost:5173
4. Login with:
   - Email: `admin@prequaliq.com`
   - Password: `admin123`

## Common Issues

### Issue 1: Port 5000 Already in Use

```bash
# Find what's using port 5000
lsof -i:5000

# Kill the process
kill -9 <PID>
```

### Issue 2: Database Connection Error

Check `backend/.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prequaliq_db
DB_USER=muhammadusmanfarooqmuhammadusman
DB_PASSWORD=
```

Make sure PostgreSQL is running:
```bash
brew services list | grep postgresql
```

### Issue 3: Admin User Doesn't Exist

Recreate admin user:
```bash
cd backend
npm run create-admin
```

### Issue 4: CORS Error

Check `backend/.env`:
```env
FRONTEND_URL=http://localhost:5173
```

## Quick Fix: Restart Everything

**Terminal 1 - Backend:**
```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq/frontend
npm run dev
```

**Terminal 3 - Test:**
```bash
# Test backend
curl http://localhost:5000/api/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@prequaliq.com","password":"admin123"}'
```

## Expected Login Flow

1. ✅ Backend running on port 5000
2. ✅ Frontend running on port 5173
3. ✅ Open http://localhost:5173
4. ✅ Enter credentials and click Login
5. ✅ Redirected to Admin Dashboard

## Check Browser Console

Open browser DevTools (F12) → Console tab
- Look for any red error messages
- Check Network tab → see if login request is being made
- Check if request is going to `http://localhost:5000/api/auth/login`
