-- Crear extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla households
CREATE TABLE IF NOT EXISTS households (
                                          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                          name VARCHAR(255) NOT NULL,
                                          created_at TIMESTAMPTZ DEFAULT NOW(),
                                          updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear tabla users
CREATE TABLE IF NOT EXISTS users (
                                     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                     email VARCHAR(255) UNIQUE NOT NULL,
                                     auth_provider_id VARCHAR(255) UNIQUE NOT NULL,
                                     household_id UUID REFERENCES households(id),
                                     created_at TIMESTAMPTZ DEFAULT NOW(),
                                     updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modificar tablas existentes
ALTER TABLE expenses ADD COLUMN household_id UUID;
ALTER TABLE categories ADD COLUMN household_id UUID;
ALTER TABLE subcategories ADD COLUMN household_id UUID;

-- Crear un hogar por defecto
INSERT INTO households (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'Hogar por defecto')
ON CONFLICT (id) DO NOTHING;

-- Asignar todos los datos existentes al hogar por defecto
UPDATE expenses SET household_id = '00000000-0000-0000-0000-000000000000' WHERE household_id IS NULL;
UPDATE categories SET household_id = '00000000-0000-0000-0000-000000000000' WHERE household_id IS NULL;
UPDATE subcategories SET household_id = '00000000-0000-0000-0000-000000000000' WHERE household_id IS NULL;

-- Añadir las restricciones NOT NULL y las referencias
ALTER TABLE expenses
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT fk_expenses_household FOREIGN KEY (household_id) REFERENCES households(id);

ALTER TABLE categories
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT fk_categories_household FOREIGN KEY (household_id) REFERENCES households(id);

ALTER TABLE subcategories
    ALTER COLUMN household_id SET NOT NULL,
    ADD CONSTRAINT fk_subcategories_household FOREIGN KEY (household_id) REFERENCES households(id);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_expenses_household_id ON expenses(household_id);
CREATE INDEX idx_categories_household_id ON categories(household_id);
CREATE INDEX idx_subcategories_household_id ON subcategories(household_id);
CREATE INDEX idx_users_household_id ON users(household_id);