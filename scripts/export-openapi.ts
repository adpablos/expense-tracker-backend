import fs from 'fs';
import path from 'path';

import swaggerJsdoc from 'swagger-jsdoc';

import { options } from '../src/swagger';

const specs = swaggerJsdoc(options);

// Save the specification to a JSON file
fs.writeFileSync(path.join(__dirname, '../openapi.json'), JSON.stringify(specs, null, 2), 'utf8');
console.log('OpenAPI specification exported to openapi.json');
