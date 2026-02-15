# Frontend Troubleshooting Guide

## Issue: Frontend not starting on http://localhost:5173

### Quick Fix Steps:

1. **Stop all running processes:**
   ```bash
   # Kill any processes on ports 5000 and 5173
   lsof -ti:5000 | xargs kill -9 2>/dev/null
   lsof -ti:5173 | xargs kill -9 2>/dev/null
   ```

2. **Reinstall frontend dependencies:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Start frontend manually:**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Check for errors in the terminal output**

### Common Issues and Solutions:

#### Issue 1: Port 5173 already in use
```bash
# Find what's using the port
lsof -i:5173

# Kill the process
kill -9 <PID>
```

#### Issue 2: Missing dependencies
```bash
cd frontend
npm install
```

#### Issue 3: TypeScript errors
```bash
cd frontend
npx tsc --noEmit
# Fix any errors shown
```

#### Issue 4: Vite not found
```bash
cd frontend
npm install vite @vitejs/plugin-react --save-dev
```

### Manual Start (Recommended):

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Check if servers are running:

```bash
# Check backend
curl http://localhost:5000/api/health

# Check frontend (should return HTML)
curl http://localhost:5173
```

### Expected Output:

**Backend should show:**
```
Server running on port 5000
```

**Frontend should show:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### If Still Not Working:

1. **Check Node.js version:**
   ```bash
   node --version  # Should be v18 or higher
   ```

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

3. **Check for syntax errors:**
   ```bash
   cd frontend
   npm run build
   ```

4. **Check browser console** for any JavaScript errors

5. **Try a different port:**
   Edit `frontend/vite.config.ts`:
   ```typescript
   server: {
     port: 3000,  // Change from 5173
   }
   ```

### Alternative: Use separate terminals

Instead of `npm run dev` from root, use two separate terminals:

**Terminal 1:**
```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq/backend
npm run dev
```

**Terminal 2:**
```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq/frontend
npm run dev
```

This way you can see the output from each server separately and identify any errors.
