import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const isProduction = process.env.NPM_CONFIG_PRODUCTION === 'true';

async function prepareProductionDB() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar si el hogar ya existe
        let household = (await client.query(
            "SELECT id FROM households WHERE name = 'Diana-Lua-Alex home'"
        )).rows[0];

        if (!household) {
            // Crear el hogar compartido si no existe
            household = (await client.query(
                "INSERT INTO households (name) VALUES ('Diana-Lua-Alex home') RETURNING id"
            )).rows[0];
            console.log('Nuevo hogar creado');
        } else {
            console.log('El hogar ya existe');
        }

        // Función para crear o obtener usuario
        async function createOrGetUser(email: string, name: string, authProviderId: string) {
            let user = (await client.query(
                "SELECT id FROM users WHERE auth_provider_id = $1",
                [authProviderId]
            )).rows[0];

            if (!user) {
                user = (await client.query(
                    "INSERT INTO users (email, name, auth_provider_id) VALUES ($1, $2, $3) RETURNING id",
                    [email, name, authProviderId]
                )).rows[0];
                console.log(`Nuevo usuario creado: ${name}`);
            } else {
                console.log(`Usuario ya existe: ${name}`);
            }

            return user;
        }

        // Crear o obtener usuario para ti (propietario)
        const ownerUser = await createOrGetUser('adpabloslopez@gmail.com', 'Alex', 'auth0|66bcf68d2b9b21bece891d55');

        // Crear o obtener usuario para Diana (miembro)
        const memberUser = await createOrGetUser('edrada2000@yahoo.es', 'Diana', 'auth0|66bcf63d2b9b21bece891d26');

        // Asignar roles en el hogar (si no existen ya)
        const existingMembers = (await client.query(
            "SELECT user_id, role FROM household_members WHERE household_id = $1",
            [household.id]
        )).rows;

        if (!existingMembers.some(m => m.user_id === ownerUser.id)) {
            await client.query(
                "INSERT INTO household_members (household_id, user_id, role, status) VALUES ($1, $2, 'owner', 'active')",
                [household.id, ownerUser.id]
            );
            console.log('Rol de propietario asignado a Alex');
        }

        if (!existingMembers.some(m => m.user_id === memberUser.id)) {
            await client.query(
                "INSERT INTO household_members (household_id, user_id, role, status) VALUES ($1, $2, 'member', 'active')",
                [household.id, memberUser.id]
            );
            console.log('Rol de miembro asignado a Diana');
        }

        // Asociar datos existentes al hogar (si es necesario)
        let updateQuery;
        if (isProduction) {
            updateQuery = "household_id IS NULL";
        } else {
            updateQuery = "household_id = '00000000-0000-0000-0000-000000000000'";
        }

        const updatedCategories = await client.query(`UPDATE categories SET household_id = $1 WHERE ${updateQuery} RETURNING id`, [household.id]);
        const updatedSubcategories = await client.query(`UPDATE subcategories SET household_id = $1 WHERE ${updateQuery} RETURNING id`, [household.id]);
        const updatedExpenses = await client.query(`UPDATE expenses SET household_id = $1 WHERE ${updateQuery} RETURNING id`, [household.id]);

        console.log(`Categorías actualizadas: ${updatedCategories.rowCount}`);
        console.log(`Subcategorías actualizadas: ${updatedSubcategories.rowCount}`);
        console.log(`Gastos actualizados: ${updatedExpenses.rowCount}`);

        // Si estamos en local, eliminar el household predeterminado
        if (!isProduction) {
            await client.query("DELETE FROM households WHERE id = '00000000-0000-0000-0000-000000000000'");
            console.log('Household predeterminado eliminado');
        }

        await client.query('COMMIT');
        console.log('Base de datos preparada exitosamente.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al preparar la base de datos:', error);
    } finally {
        client.release();
    }
}

prepareProductionDB().then(() => process.exit());