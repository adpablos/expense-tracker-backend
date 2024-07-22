import dotenv from 'dotenv';

dotenv.config();

interface Config {
    port: number;
    dbUser: string;
    dbHost: string;
    dbName: string;
    dbPassword: string;
    dbPort: number;
    nodeEnv: string;
}

const config: Config = {
    port: parseInt(process.env.PORT || '3000', 10),
    dbUser: process.env.DB_USER || '',
    dbHost: process.env.DB_HOST || '',
    dbName: process.env.DB_NAME || '',
    dbPassword: process.env.DB_PASSWORD || '',
    dbPort: parseInt(process.env.DB_PORT || '5432', 10),
    nodeEnv: process.env.NODE_ENV || 'development'
};

export default config;