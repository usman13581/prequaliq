# Quick Start Commands - Copy & Paste

## 🚀 Start Everything (Copy these commands)

### Terminal 1 - Backend:
```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq/backend && npm run dev
```

### Terminal 2 - Frontend:
```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq/frontend && npm run dev
```

---

## 🔧 Fix Port Issues

### Free Port 5000:
```bash
lsof -ti:5000 | xargs kill -9
```

### Free Port 5173:
```bash
lsof -ti:5173 | xargs kill -9
```

---

## ✅ Verify Servers

### Test Backend:
```bash
curl http://localhost:5000/api/health
```

### Test Frontend:
```bash
curl http://localhost:5173 | head -5
```

---

## 🔐 Login Info

**URL:** http://localhost:5173

**Admin:**
- Email: `admin@prequaliq.com`
- Password: `admin123`

---

## 🛑 Stop Servers

Press `Ctrl + C` in each terminal
