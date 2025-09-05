-- Crear un hogar de prueba
INSERT INTO households (id, name) 
VALUES (uuid_generate_v4(), 'Test Household');

-- Obtener el ID del hogar recién creado
DO $$
DECLARE
    current_household_id UUID;
BEGIN
    SELECT id INTO current_household_id FROM households WHERE name = 'Test Household' LIMIT 1;

    -- Crear usuarios de prueba
    INSERT INTO users (id, email, name, auth_provider_id) 
    VALUES 
      (uuid_generate_v4(), 'test@example.com', 'Test User', 'auth0|123456'),
      (uuid_generate_v4(), 'test2@example.com', 'Test User 2', 'auth0|654321');

    -- Asociar los usuarios al hogar
    INSERT INTO household_members (household_id, user_id, role, status)
    SELECT current_household_id, id, 'OWNER', 'ACTIVE'
    FROM users
    WHERE email = 'test@example.com';

    INSERT INTO household_members (household_id, user_id, role, status)
    SELECT current_household_id, id, 'MEMBER', 'ACTIVE'
    FROM users
    WHERE email = 'test2@example.com';

    -- Añadir algunas categorías de prueba
    INSERT INTO categories (id, name, household_id)
    VALUES 
      (uuid_generate_v4(), 'Casa', current_household_id),
      (uuid_generate_v4(), 'Coche', current_household_id),
      (uuid_generate_v4(), 'Servicios', current_household_id);

    -- Añadir algunas subcategorías de prueba
    INSERT INTO subcategories (id, name, category_id, household_id)
    SELECT uuid_generate_v4(), 'Hipoteca', id, current_household_id
    FROM categories
    WHERE name = 'Casa' AND household_id = current_household_id;

    INSERT INTO subcategories (id, name, category_id, household_id)
    SELECT uuid_generate_v4(), 'Mantenimiento', id, current_household_id
    FROM categories
    WHERE name = 'Casa' AND household_id = current_household_id;

    INSERT INTO subcategories (id, name, category_id, household_id)
    SELECT uuid_generate_v4(), 'Gasolina', id, current_household_id
    FROM categories
    WHERE name = 'Coche' AND household_id = current_household_id;

    INSERT INTO subcategories (id, name, category_id, household_id)
    SELECT uuid_generate_v4(), 'Internet', id, current_household_id
    FROM categories
    WHERE name = 'Servicios' AND household_id = current_household_id;
END $$;
