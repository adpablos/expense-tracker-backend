-- init-db.sql
-- This script is used to create and update the database schema
SET TIMEZONE='UTC';

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create or update households table
CREATE TABLE IF NOT EXISTS households (
                                          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                          name VARCHAR(255) NOT NULL,
                                          created_at TIMESTAMPTZ DEFAULT NOW(),
                                          updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create or update users table
CREATE TABLE IF NOT EXISTS users (
                                     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                     email VARCHAR(255) UNIQUE NOT NULL,
                                     name VARCHAR(255) NOT NULL,
                                     auth_provider_id VARCHAR(255) UNIQUE NOT NULL,
                                     created_at TIMESTAMPTZ DEFAULT NOW(),
                                     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create household_members table
CREATE TABLE IF NOT EXISTS household_members (
                                                 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                                 household_id UUID NOT NULL REFERENCES households(id),
                                                 user_id UUID NOT NULL REFERENCES users(id),
                                                 role VARCHAR(50) NOT NULL,
                                                 status VARCHAR(50) NOT NULL,
                                                 created_at TIMESTAMPTZ DEFAULT NOW(),
                                                 updated_at TIMESTAMPTZ DEFAULT NOW(),
                                                 UNIQUE(household_id, user_id)
);

-- Update expenses table
CREATE TABLE IF NOT EXISTS expenses (
                                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                        description TEXT NOT NULL,
                                        amount DECIMAL(10, 2) NOT NULL,
                                        category VARCHAR(50) NOT NULL,
                                        subcategory VARCHAR(50) NOT NULL,
                                        expense_datetime TIMESTAMPTZ NOT NULL,
                                        household_id UUID NOT NULL REFERENCES households(id),
                                        created_at TIMESTAMPTZ DEFAULT NOW(),
                                        updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update categories table
CREATE TABLE IF NOT EXISTS categories (
                                          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                          name VARCHAR(255) NOT NULL,
                                          household_id UUID NOT NULL REFERENCES households(id),
                                          UNIQUE(name, household_id)
);

-- Update subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
                                             id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                             name VARCHAR(255) NOT NULL,
                                             category_id UUID REFERENCES categories(id),
                                             household_id UUID NOT NULL REFERENCES households(id),
                                             UNIQUE(name, category_id, household_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_household_id ON expenses(household_id);
CREATE INDEX IF NOT EXISTS idx_categories_household_id ON categories(household_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_household_id ON subcategories(household_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);

-- Create a default household (optional, depending on your application logic)
INSERT INTO households (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Household')
ON CONFLICT (id) DO NOTHING;