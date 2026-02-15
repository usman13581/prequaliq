# PrequaliQ Supplier Qualification & Procurement Platform

A centralized procurement and supplier qualification platform connecting Admin, Procuring Entities, and Suppliers.

## Features

- **Multi-role Access Control**: Admin, Procuring Entity, and Supplier roles
- **Supplier Onboarding**: Complete workflow from registration to approval
- **CPV-based Classification**: Common Procurement Vocabulary code system
- **Dynamic Questionnaires**: Create questionnaires linked to CPV codes
- **Document Management**: Upload and manage company documents
- **Announcement System**: Targeted announcements with expiry dates
- **Supplier Search & Filtering**: Advanced search by multiple parameters

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Sequelize ORM
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Authentication**: JWT-based authentication
- **File Uploads**: Multer

## Installation

See [SETUP.md](./SETUP.md) for detailed setup instructions.

Quick start:
1. Install dependencies:
```bash
npm run install-all
```

2. Set up database:
- Create PostgreSQL database
- Copy `backend/.env.example` to `backend/.env` and update credentials
- Run migrations: `cd backend && npm run migrate`
- Seed CPV codes: `cd backend && npm run seed`

3. Start development servers:
```bash
npm run dev
```

## Project Structure

```
prequaliq-platform/
├── backend/          # Node.js/Express API
├── frontend/         # React application
└── database/         # Database schemas and migrations
```

## User Roles

### Admin
- Create and manage procuring entities and suppliers
- Review and approve supplier profiles
- Create announcements
- Full system control

### Procuring Entity
- View approved suppliers
- Create dynamic questionnaires
- Search and filter suppliers
- Create CPV-based announcements

### Supplier
- Complete profile and upload documents
- Select CPV categories
- Respond to questionnaires
- View announcements
