import swaggerJsdoc from 'swagger-jsdoc';
import fs from 'fs';
import path from 'path';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Expense Tracker API',
            version: '1.0.0',
            description: 'API for managing expenses, categories, and subcategories',
        },
    },
    apis: [path.join(__dirname, '../src/routes/*.ts')], // Ruta a tus archivos de rutas
};

const specs = swaggerJsdoc(options);

// Guardar la especificación en un archivo JSON
fs.writeFileSync(path.join(__dirname, '../openapi.json'), JSON.stringify(specs, null, 2), 'utf8');
console.log('OpenAPI specification exported to openapi.json');
