-- init-db.sql
-- This script is used to create the database schema
SET TIMEZONE='UTC';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
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

CREATE TABLE IF NOT EXISTS categories (
                                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                        name VARCHAR(255) UNIQUE NOT NULL
    );

CREATE TABLE IF NOT EXISTS subcategories (
                                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                        name VARCHAR(255) NOT NULL,
                                        category_id UUID REFERENCES categories(id)
    );
