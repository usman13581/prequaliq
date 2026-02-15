-- ============================================
-- TRUNCATE ALL TABLES EXCEPT USERS
-- ============================================
-- Run this script to delete all data from tables except users
-- WARNING: This will delete ALL data! Cannot be undone!
-- ============================================

-- For PostgreSQL: Use TRUNCATE CASCADE to handle foreign keys
-- For MySQL: Use TRUNCATE (may need to disable foreign key checks first)

-- Delete in order to respect foreign key constraints

-- 1. Answers (references questionnaire_responses, questions)
TRUNCATE TABLE answers CASCADE;

-- 2. Questionnaire Responses (references questionnaires, suppliers)
TRUNCATE TABLE questionnaire_responses CASCADE;

-- 3. Questions (references questionnaires)
TRUNCATE TABLE questions CASCADE;

-- 4. Questionnaires (references procuring_entities, cpv_codes)
TRUNCATE TABLE questionnaires CASCADE;

-- 5. Documents (references suppliers, procuring_entities)
TRUNCATE TABLE documents CASCADE;

-- 6. Supplier CPV associations (junction table)
TRUNCATE TABLE supplier_cpv CASCADE;

-- 7. Announcements (references procuring_entities, cpv_codes, users)
TRUNCATE TABLE announcements CASCADE;

-- 8. Suppliers (references users)
TRUNCATE TABLE suppliers CASCADE;

-- 9. Procuring Entities (references users, companies)
TRUNCATE TABLE procuring_entities CASCADE;

-- 10. Companies
TRUNCATE TABLE companies CASCADE;

-- 11. CPV Codes (optional - uncomment if you want to delete these too)
-- TRUNCATE TABLE cpv_codes CASCADE;

-- ============================================
-- NOTE: Users table is NOT truncated - all user accounts are preserved
-- ============================================

-- For MySQL users: If you get foreign key errors, run this first:
-- SET FOREIGN_KEY_CHECKS = 0;
-- (then run the TRUNCATE statements above)
-- SET FOREIGN_KEY_CHECKS = 1;
