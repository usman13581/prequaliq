# PrequaliQ Platform - Complete Requirements

## User Levels

### 1. ADMIN ✅
**Responsibilities:**
- ✅ Create and manage procuring entities and suppliers
- ✅ Assign user roles and permissions
- ✅ Review supplier profile submissions and approve/reject them
- ✅ Create announcements with expiry dates for suppliers and procuring entities
- ✅ Monitor all activities in the system
- ✅ **NEW:** Activate/Deactivate suppliers and procuring entities
- ✅ **NEW:** Edit supplier and procuring entity information

**Supplier Onboarding Process:**
- ✅ Admin creates supplier account
- ⏳ Supplier logs in and fills profile information (to be implemented in supplier dashboard)
- ⏳ Supplier uploads required documents (to be implemented)
- ✅ Admin reviews and approves/rejects supplier

### 2. PROCURING ENTITY ⏳
**Responsibilities:**
- ⏳ View all admin-approved suppliers
- ⏳ Access supplier profiles and documents
- ⏳ Update their own profile and upload documents
- ⏳ Create dynamic questionnaires linked to CPV codes
- ⏳ Set questionnaire deadlines
- ⏳ Review supplier responses and attachments
- ⏳ Search and filter suppliers based on profile parameters (turnover, categories, certifications, location)
- ⏳ Create CPV-based announcements targeted to specific suppliers

**Questionnaire Management:**
- ⏳ Each questionnaire belongs to one CPV category
- ⏳ Each question can have an optional document requirement
- ⏳ Suppliers must upload documents if required before submission
- ⏳ Procuring entity can view answers after final submission

### 3. SUPPLIER ⏳
**Responsibilities:**
- ⏳ Complete profile and upload company documents
- ⏳ Select multiple CPV business categories
- ⏳ View questionnaires matching their CPV codes
- ⏳ Fill answers and upload required documents
- ⏳ Save responses as drafts before final submission
- ⏳ Submit final responses before deadline
- ⏳ View history of submitted questionnaires
- ⏳ Update profile and CPV selections anytime

**Supplier Dashboard Features:**
- ⏳ Dynamic display of active questionnaires
- ⏳ Multiple questionnaire cards appear if available
- ⏳ Read-only view after submission
- ⏳ Automatic removal after deadline expiry

## Key System Features

- ✅ Multi-role access control
- ✅ Supplier approval workflow
- ⏳ Dynamic questionnaire builder
- ⏳ CPV-based targeting system
- ⏳ Document management module
- ⏳ Deadline-driven workflows
- ✅ Announcement management system (Admin can create)
- ⏳ Supplier search and filtering
- ⏳ Draft and final submission tracking
- ✅ **NEW:** Active/Inactive status management

## Implementation Status

### ✅ Completed Features

1. **Authentication & Authorization**
   - ✅ User registration and login
   - ✅ JWT-based authentication
   - ✅ Role-based access control (Admin, Procuring Entity, Supplier)

2. **Admin Features**
   - ✅ Create suppliers
   - ✅ Create procuring entities
   - ✅ Create companies
   - ✅ View all suppliers
   - ✅ Approve/Reject suppliers
   - ✅ **NEW:** Edit suppliers
   - ✅ **NEW:** Edit procuring entities
   - ✅ **NEW:** Activate/Deactivate suppliers
   - ✅ **NEW:** Activate/Deactivate procuring entities
   - ✅ Create announcements
   - ✅ View all announcements

3. **Database Schema**
   - ✅ All tables created
   - ✅ Relationships configured
   - ✅ CPV codes seeded

### ⏳ Pending Features

1. **Supplier Dashboard**
   - ⏳ Profile completion form
   - ⏳ Document upload functionality
   - ⏳ CPV code selection (multi-select)
   - ⏳ Active questionnaires display
   - ⏳ Questionnaire response form
   - ⏳ Draft save functionality
   - ⏳ Submission functionality
   - ⏳ Questionnaire history

2. **Procuring Entity Dashboard**
   - ⏳ Profile management
   - ⏳ Document upload
   - ⏳ Questionnaire builder
   - ⏳ Question creation with document requirements
   - ⏳ Supplier search and filter
   - ⏳ View supplier profiles and documents
   - ⏳ View questionnaire responses
   - ⏳ Create CPV-based announcements

3. **Questionnaire System**
   - ⏳ Dynamic questionnaire creation
   - ⏳ Question types (text, yes/no, multiple choice, etc.)
   - ⏳ Document attachment requirements
   - ⏳ CPV code linking
   - ⏳ Deadline management
   - ⏳ Response submission
   - ⏳ Draft functionality
   - ⏳ Response viewing

4. **Document Management**
   - ⏳ File upload UI
   - ⏳ Document type categorization
   - ⏳ Document viewing
   - ⏳ Document download

5. **CPV System**
   - ⏳ CPV code selection UI
   - ⏳ Multi-select functionality
   - ⏳ CPV-based filtering

6. **Search & Filter**
   - ⏳ Supplier search interface
   - ⏳ Filter by turnover
   - ⏳ Filter by category/CPV
   - ⏳ Filter by location
   - ⏳ Filter by certifications

## Next Steps

1. **Supplier Dashboard Implementation**
   - Profile completion form
   - CPV code multi-select
   - Document upload
   - Active questionnaires display

2. **Procuring Entity Dashboard Implementation**
   - Questionnaire builder
   - Supplier search and filter
   - Response viewing

3. **Questionnaire System**
   - Full questionnaire workflow
   - Draft and submission
   - Response management

4. **Testing**
   - End-to-end testing
   - User acceptance testing
