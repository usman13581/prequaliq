# PrequaliQ Platform - Complete Step-by-Step Guide

## 🚀 STEP 1: Free Port 5000 (If Already in Use)

**In your terminal, run:**
```bash
lsof -ti:5000 | xargs kill -9
```

**Or use the script:**
```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq
./fix-port-5000.sh
```

---

## 🖥️ STEP 2: Start Backend Server

**Open Terminal 1 and run:**
```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq/backend
npm run dev
```

**✅ You should see:**
```
Server running on port 5000
```

**Keep this terminal open!** The backend must stay running.

---

## 🌐 STEP 3: Start Frontend Server

**Open Terminal 2 (new terminal window) and run:**
```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq/frontend
npm run dev
```

**✅ You should see:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

**Keep this terminal open too!** The frontend must stay running.

---

## ✅ STEP 4: Verify Both Servers Are Running

**Open Terminal 3 (new terminal) and test:**

```bash
# Test backend
curl http://localhost:5000/api/health
```

**Should return:**
```json
{"status":"OK","message":"PrequaliQ API is running"}
```

```bash
# Test frontend (should return HTML)
curl http://localhost:5173 | head -5
```

---

## 🔐 STEP 5: Login to the Application

1. **Open your web browser**
2. **Go to:** http://localhost:5173
3. **You'll see the Login page**

4. **Enter Admin Credentials:**
   - **Email:** `admin@prequaliq.com`
   - **Password:** `admin123`

5. **Click "Login" button**

6. **✅ You should be redirected to:** http://localhost:5173/admin

---

## 📋 STEP 6: What You'll See After Login

### Admin Dashboard has 3 tabs:

1. **Suppliers Tab**
   - View all suppliers
   - Approve/reject suppliers
   - Create new supplier accounts

2. **Procuring Entities Tab**
   - View all procuring entities
   - Create new procuring entities
   - Manage companies

3. **Announcements Tab**
   - Create announcements
   - View all announcements
   - Set expiry dates

---

## 🧪 STEP 7: Test the Application - Create a Supplier

### Option A: Create Supplier via Admin Dashboard

1. **Click on "Suppliers" tab**
2. **Look for "Create Supplier" button** (you may need to implement this UI)
3. **Or use the API directly** (see below)

### Option B: Register as Supplier (Recommended for Testing)

1. **Logout** (click logout button in top right)
2. **Click "Register here" link** on login page
3. **Fill the registration form:**
   - **Role:** Select "Supplier"
   - **First Name:** Your first name
   - **Last Name:** Your last name
   - **Email:** supplier@example.com
   - **Phone:** Your phone number
   - **Password:** Choose a password (min 6 characters)
4. **Click "Register"**
5. **You'll be logged in as supplier**

---

## 📝 STEP 8: Complete Supplier Profile

**After registering as supplier:**

1. **You'll see Supplier Dashboard** with tabs:
   - Active Questionnaires
   - History
   - Profile
   - Documents

2. **Click "Profile" tab**

3. **Fill in supplier information:**
   - Company Name
   - Registration Number
   - Address
   - City, Country
   - Turnover
   - Employee Count
   - Year Established

4. **Click "CPV Codes"** to select business categories

5. **Click "Documents" tab** to upload company documents

6. **Save your profile**

---

## ✅ STEP 9: Approve Supplier (As Admin)

1. **Logout from supplier account**

2. **Login as admin again:**
   - Email: `admin@prequaliq.com`
   - Password: `admin123`

3. **Go to "Suppliers" tab**

4. **Find the supplier you just created**

5. **Click "Review" or "Approve" button**

6. **Supplier status changes to "Approved"**

---

## 📊 STEP 10: Create Procuring Entity (As Admin)

1. **In Admin Dashboard, go to "Procuring Entities" tab**

2. **Create a new procuring entity:**
   - Click "Create Procuring Entity" (or use API)
   - Enter entity details
   - Assign to a company

3. **Or register directly:**
   - Logout
   - Register with role "Procuring Entity"
   - Login with new credentials

---

## 📋 STEP 11: Create Questionnaire (As Procuring Entity)

1. **Login as Procuring Entity**

2. **Go to "Questionnaires" tab**

3. **Click "Create Questionnaire"**

4. **Fill in:**
   - Title
   - Description
   - Select CPV Code
   - Set Deadline
   - Add Questions

5. **For each question:**
   - Question text
   - Question type (text, yes/no, etc.)
   - Mark if document required
   - Set order

6. **Save Questionnaire**

---

## 📤 STEP 12: Supplier Responds to Questionnaire

1. **Login as Supplier**

2. **Go to "Active Questionnaires" tab**

3. **You'll see questionnaires matching your CPV codes**

4. **Click on a questionnaire**

5. **Fill in answers**

6. **Upload required documents if any**

7. **Save as Draft** (can edit later)

8. **Submit Final Response** (before deadline)

---

## 🔍 STEP 13: View Responses (As Procuring Entity)

1. **Login as Procuring Entity**

2. **Go to "Questionnaires" tab**

3. **Click on a questionnaire**

4. **View "Responses" section**

5. **See all submitted responses from suppliers**

6. **Review answers and documents**

---

## 📢 STEP 14: Create Announcement

### As Admin:
1. **Go to "Announcements" tab**
2. **Click "Create Announcement"**
3. **Fill in:**
   - Title
   - Content
   - Target Audience (Suppliers/Procuring Entities/All)
   - CPV Code (optional, for targeting)
   - Expiry Date
4. **Save**

### As Procuring Entity:
- Same process, but announcements are scoped to your entity

---

## 🔍 STEP 15: Search Suppliers (As Procuring Entity)

1. **Login as Procuring Entity**

2. **Go to "Search Suppliers" tab**

3. **Use filters:**
   - Search by name/email
   - Filter by city
   - Filter by country
   - Filter by turnover range
   - Filter by CPV code
   - Filter by certifications

4. **View supplier profiles**

5. **Download supplier documents**

---

## 🛑 STEP 16: Stop the Servers

**When you're done:**

1. **Go to Terminal 1 (Backend)**
   - Press `Ctrl + C`
   - Backend stops

2. **Go to Terminal 2 (Frontend)**
   - Press `Ctrl + C`
   - Frontend stops

---

## 📝 Quick Reference

### Server URLs:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

### Admin Credentials:
- **Email:** admin@prequaliq.com
- **Password:** admin123

### User Roles:
1. **Admin** - Full system control
2. **Procuring Entity** - Create questionnaires, search suppliers
3. **Supplier** - Complete profile, respond to questionnaires

### Important Notes:
- ✅ Both servers must be running for the app to work
- ✅ Backend must be running before frontend
- ✅ Keep both terminal windows open while using the app
- ✅ Change admin password after first login
- ✅ Suppliers must be approved by admin before they can see questionnaires

---

## 🐛 Troubleshooting

### Backend won't start:
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Start again
cd backend && npm run dev
```

### Frontend won't start:
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Start again
cd frontend && npm run dev
```

### Login fails:
1. Check backend is running: `curl http://localhost:5000/api/health`
2. Check browser console (F12) for errors
3. Verify credentials are correct

### Database errors:
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if needed
brew services start postgresql@14
```

---

## ✅ Checklist

- [ ] Port 5000 is free
- [ ] Backend server running (Terminal 1)
- [ ] Frontend server running (Terminal 2)
- [ ] Backend health check works
- [ ] Can access http://localhost:5173
- [ ] Admin login successful
- [ ] Can see Admin Dashboard
- [ ] Ready to test features!

---

**You're all set! Follow these steps and you'll have the PrequaliQ platform running! 🎉**
