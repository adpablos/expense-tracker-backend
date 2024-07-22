-- Add initial data to the database if they do not exist
DO
$$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Casa') THEN
        INSERT INTO categories (name) VALUES
            ('Casa'),
            ('Coche'),
            ('Servicios'),
            ('Ocio'),
            ('Vacaciones'),
            ('Súper'),
            ('Otros');
END IF;
END
$$;

DO
$$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Hipoteca' AND category_id = (SELECT id FROM categories WHERE name = 'Casa')) THEN
        INSERT INTO subcategories (name, category_id) VALUES
            ('Hipoteca', (SELECT id FROM categories WHERE name='Casa')),
            ('HOA', (SELECT id FROM categories WHERE name='Casa')),
            ('Mantenimiento', (SELECT id FROM categories WHERE name='Casa')),
            ('Seguro', (SELECT id FROM categories WHERE name='Casa')),
            ('Gasolina', (SELECT id FROM categories WHERE name='Coche')),
            ('Mantenimiento', (SELECT id FROM categories WHERE name='Coche')),
            ('Seguro', (SELECT id FROM categories WHERE name='Coche')),
            ('Peajes', (SELECT id FROM categories WHERE name='Coche')),
            ('Gas', (SELECT id FROM categories WHERE name='Servicios')),
            ('Internet', (SELECT id FROM categories WHERE name='Servicios')),
            ('Agua', (SELECT id FROM categories WHERE name='Servicios')),
            ('Luz', (SELECT id FROM categories WHERE name='Servicios')),
            ('Teléfono', (SELECT id FROM categories WHERE name='Servicios')),
            ('Restaurantes', (SELECT id FROM categories WHERE name='Ocio')),
            ('Streaming - tv', (SELECT id FROM categories WHERE name='Ocio')),
            ('Gym', (SELECT id FROM categories WHERE name='Ocio')),
            ('Music', (SELECT id FROM categories WHERE name='Ocio')),
            ('Vuelos', (SELECT id FROM categories WHERE name='Vacaciones')),
            ('Hotel', (SELECT id FROM categories WHERE name='Vacaciones')),
            ('Comida', (SELECT id FROM categories WHERE name='Súper')),
            ('Médico', (SELECT id FROM categories WHERE name='Otros')),
            ('Dentista', (SELECT id FROM categories WHERE name='Otros')),
            ('Formación', (SELECT id FROM categories WHERE name='Otros')),
            ('Regalos', (SELECT id FROM categories WHERE name='Otros'));
END IF;
END
$$;
