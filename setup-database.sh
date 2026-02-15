#!/bin/bash

# PrequaliQ Database Setup Script

echo "=========================================="
echo "PrequaliQ Database Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PostgreSQL is running
echo "Step 1: Checking PostgreSQL server..."
if pg_isready > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL is not running${NC}"
    echo ""
    echo "Please start PostgreSQL first:"
    echo "  brew services start postgresql@14"
    echo "  # or"
    echo "  brew services start postgresql"
    echo ""
    exit 1
fi

# Check if database exists
echo ""
echo "Step 2: Checking if database exists..."
DB_EXISTS=$(psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw prequaliq_db && echo "yes" || echo "no")

if [ "$DB_EXISTS" = "yes" ]; then
    echo -e "${YELLOW}⚠ Database 'prequaliq_db' already exists${NC}"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb prequaliq_db 2>/dev/null || psql postgres -c "DROP DATABASE prequaliq_db;" 2>/dev/null
        echo -e "${GREEN}✓ Database dropped${NC}"
    else
        echo "Using existing database..."
    fi
fi

# Create database if it doesn't exist
if [ "$DB_EXISTS" != "yes" ] || [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Step 3: Creating database..."
    createdb prequaliq_db 2>/dev/null || psql postgres -c "CREATE DATABASE prequaliq_db;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database 'prequaliq_db' created${NC}"
    else
        echo -e "${RED}✗ Failed to create database${NC}"
        echo ""
        echo "Please create the database manually:"
        echo "  createdb prequaliq_db"
        echo "  # or"
        echo "  psql postgres -c \"CREATE DATABASE prequaliq_db;\""
        exit 1
    fi
fi

# Run migrations
echo ""
echo "Step 4: Running database migrations..."
cd backend
npm run migrate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrations completed successfully${NC}"
else
    echo -e "${RED}✗ Migrations failed${NC}"
    echo ""
    echo "Please check your database configuration in backend/.env"
    exit 1
fi

# Seed CPV codes
echo ""
echo "Step 5: Seeding CPV codes..."
npm run seed

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ CPV codes seeded successfully${NC}"
else
    echo -e "${YELLOW}⚠ CPV seeding failed (may already be seeded)${NC}"
fi

# Create admin user
echo ""
echo "Step 6: Creating admin user..."
echo "Default credentials:"
echo "  Email: admin@prequaliq.com"
echo "  Password: admin123"
echo ""
read -p "Do you want to create admin user with default credentials? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    npm run create-admin admin@prequaliq.com admin123 Admin User
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Admin user created successfully${NC}"
        echo ""
        echo -e "${YELLOW}⚠ IMPORTANT: Change the admin password after first login!${NC}"
    else
        echo -e "${YELLOW}⚠ Admin user creation failed (may already exist)${NC}"
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your PostgreSQL credentials if needed"
echo "2. Start the application: npm run dev"
echo "3. Open http://localhost:5173"
echo "4. Login with admin credentials"
echo ""
