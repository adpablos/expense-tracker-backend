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
                                     household_id UUID REFERENCES households(id),
                                     created_at TIMESTAMPTZ DEFAULT NOW(),
                                     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update expenses table
CREATE TABLE IF NOT EXISTS expenses (
                                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                        description TEXT NOT NULL,
                                        amount DECIMAL(10, 2) NOT NULL,
                                        category VARCHAR(50) NOT NULL,
                                        subcategory VARCHAR(50) NOT NULL,
                                        expense_datetime TIMESTAMPTZ NOT NULL,
                                        created_at TIMESTAMPTZ DEFAULT NOW(),
                                        updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add household_id to expenses if it doesn't exist
DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'household_id') THEN
            ALTER TABLE expenses ADD COLUMN household_id UUID;
            ALTER TABLE expenses ADD CONSTRAINT fk_expenses_household FOREIGN KEY (household_id) REFERENCES households(id);
        END IF;
    END $$;

-- Update categories table
CREATE TABLE IF NOT EXISTS categories (
                                          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                          name VARCHAR(255) NOT NULL
);

-- Add household_id to categories if it doesn't exist
DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'household_id') THEN
            ALTER TABLE categories ADD COLUMN household_id UUID;
            ALTER TABLE categories ADD CONSTRAINT fk_categories_household FOREIGN KEY (household_id) REFERENCES households(id);
            -- Remove the existing unique constraint on name
            ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;
            -- Add a new unique constraint on name and household_id
            ALTER TABLE categories ADD CONSTRAINT categories_name_household_id_key UNIQUE (name, household_id);
        END IF;
    END $$;

-- Update subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
                                             id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                             name VARCHAR(255) NOT NULL,
                                             category_id UUID REFERENCES categories(id)
);

-- Add household_id to subcategories if it doesn't exist
DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subcategories' AND column_name = 'household_id') THEN
            ALTER TABLE subcategories ADD COLUMN household_id UUID;
            ALTER TABLE subcategories ADD CONSTRAINT fk_subcategories_household FOREIGN KEY (household_id) REFERENCES households(id);
        END IF;
    END $$;

-- Create household_members table if it doesn't exist
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_expenses_household_id ON expenses(household_id);
CREATE INDEX IF NOT EXISTS idx_categories_household_id ON categories(household_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_household_id ON subcategories(household_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_users_household_id ON users(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);

-- Create a default household (optional, depending on your application logic)
INSERT INTO households (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Household')
ON CONFLICT (id) DO NOTHING;