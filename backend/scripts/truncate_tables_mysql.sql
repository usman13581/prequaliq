-- ============================================
-- TRUNCATE ALL TABLES EXCEPT USERS (MySQL)
-- ============================================
-- Run this script to delete all data from tables except users
-- WARNING: This will delete ALL data! Cannot be undone!
-- ============================================

-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Delete in order to respect foreign key constraints

-- 1. Answers (references questionnaire_responses, questions)
TRUNCATE TABLE answers;

-- 2. Questionnaire Responses (references questionnaires, suppliers)
TRUNCATE TABLE questionnaire_responses;

-- 3. Questions (references questionnaires)
TRUNCATE TABLE questions;

-- 4. Questionnaires (references procuring_entities, cpv_codes)
TRUNCATE TABLE questionnaires;

-- 5. Documents (references suppliers, procuring_entities)
TRUNCATE TABLE documents;

-- 6. Supplier CPV associations (junction table)
TRUNCATE TABLE supplier_cpv;

-- 7. Announcements (references procuring_entities, cpv_codes, users)
TRUNCATE TABLE announcements;

-- 8. Suppliers (references users)
TRUNCATE TABLE suppliers;

-- 9. Procuring Entities (references users, companies)
TRUNCATE TABLE procuring_entities;

-- 10. Companies
TRUNCATE TABLE companies;

-- 11. CPV Codes (optional - uncomment if you want to delete these too)
-- TRUNCATE TABLE cpv_codes;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- NOTE: Users table is NOT truncated - all user accounts are preserved
-- ============================================
