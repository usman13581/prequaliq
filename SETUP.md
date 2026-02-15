# PrequaliQ Platform Setup Guide

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Database Setup

1. **Create PostgreSQL Database:**
```bash
createdb prequaliq_db
```

2. **Update Database Configuration:**
   - Copy `backend/.env.example` to `backend/.env`
   - Update the database credentials in `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=prequaliq_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

## Installation

1. **Install Root Dependencies:**
```bash
npm install
```

2. **Install Backend Dependencies:**
```bash
cd backend
npm install
```

3. **Install Frontend Dependencies:**
```bash
cd ../frontend
npm install
```

## Database Migration

1. **Run Migrations:**
```bash
cd backend
npm run migrate
```

2. **Seed CPV Codes (Optional):**
```bash
npm run seed
```

## Running the Application

### Development Mode

From the root directory:
```bash
npm run dev
```

This will start both backend (port 5000) and frontend (port 5173) servers concurrently.

### Separate Servers

**Backend only:**
```bash
cd backend
npm run dev
```

**Frontend only:**
```bash
cd frontend
npm run dev
```

## Creating Admin User

After setting up the database, you can create an admin user directly in the database:

```sql
-- First, create a user account (you'll need to hash the password using bcrypt)
-- For testing, you can use a simple script or create via API

-- Example: Create admin via API POST to /api/auth/register
-- {
--   "email": "admin@prequaliq.com",
--   "password": "admin123",
--   "firstName": "Admin",
--   "lastName": "User",
--   "role": "admin"
-- }
```

Or use a database script to insert admin user (password should be bcrypt hashed).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get user profile

### Admin Routes (require admin role)
- `POST /api/admin/suppliers` - Create supplier account
- `POST /api/admin/procuring-entities` - Create procuring entity
- `POST /api/admin/companies` - Create company
- `GET /api/admin/suppliers` - Get all suppliers
- `PUT /api/admin/suppliers/:supplierId/review` - Approve/reject supplier
- `GET /api/admin/procuring-entities` - Get all procuring entities
- `GET /api/admin/companies` - Get all companies

### Supplier Routes
- `GET /api/supplier/profile` - Get supplier profile
- `PUT /api/supplier/profile` - Update supplier profile
- `PUT /api/supplier/cpv-codes` - Update CPV codes
- `GET /api/supplier/questionnaires/active` - Get active questionnaires
- `GET /api/supplier/questionnaires/history` - Get questionnaire history

### Procuring Entity Routes
- `GET /api/procuring-entity/profile` - Get profile
- `PUT /api/procuring-entity/profile` - Update profile
- `GET /api/procuring-entity/suppliers` - Search suppliers
- `GET /api/procuring-entity/suppliers/:supplierId` - Get supplier details

### Questionnaire Routes
- `POST /api/questionnaires` - Create questionnaire (Procuring Entity)
- `GET /api/questionnaires` - Get questionnaires (Procuring Entity)
- `GET /api/questionnaires/:questionnaireId/responses` - Get responses
- `POST /api/questionnaires/:questionnaireId/responses` - Submit response (Supplier)
- `GET /api/questionnaires/:questionnaireId/responses` - Get response (Supplier)

### Document Routes
- `POST /api/documents/supplier` - Upload document (Supplier)
- `POST /api/documents/procuring-entity` - Upload document (Procuring Entity)
- `GET /api/documents` - Get documents
- `DELETE /api/documents/:documentId` - Delete document

### Announcement Routes
- `GET /api/announcements` - Get announcements
- `POST /api/announcements` - Create announcement (Admin/Procuring Entity)
- `GET /api/announcements/all` - Get all announcements (Admin)

### CPV Routes
- `GET /api/cpv` - Get CPV codes
- `GET /api/cpv/:cpvId` - Get CPV code by ID
- `POST /api/cpv` - Create CPV code (Admin)

## File Uploads

Uploaded files are stored in `backend/uploads/` directory. Make sure this directory exists and has write permissions.

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `DB_HOST` - Database host
- `DB_PORT` - Database port
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRE` - JWT expiration (default: 7d)
- `UPLOAD_PATH` - File upload path (default: ./uploads)
- `MAX_FILE_SIZE` - Max file size in bytes (default: 10485760 = 10MB)
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

## Troubleshooting

1. **Database Connection Issues:**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Migration Errors:**
   - Make sure all previous migrations ran successfully
   - Check database user has proper permissions

3. **File Upload Issues:**
   - Ensure `backend/uploads/` directory exists
   - Check file permissions
   - Verify `MAX_FILE_SIZE` setting

4. **Authentication Issues:**
   - Verify JWT_SECRET is set
   - Check token expiration settings
   - Ensure frontend and backend URLs match

## Production Deployment

1. Set `NODE_ENV=production` in backend `.env`
2. Update database credentials for production
3. Use a strong `JWT_SECRET`
4. Configure proper CORS settings
5. Set up file storage (consider cloud storage for production)
6. Enable HTTPS
7. Set up proper logging and monitoring
