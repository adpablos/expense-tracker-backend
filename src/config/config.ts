import dotenv from 'dotenv';

dotenv.config();

interface Config {
    port: number;
    dbUser: string;
    dbHost: string;
    dbDatabase: string;
    dbPassword: string;
    dbPort: number;
    nodeEnv: string;
    dbSSL: boolean;
}

const config: Config = {
    port: parseInt(process.env.PORT || '3000', 10),
    dbUser: process.env.DB_USER || '',
    dbHost: process.env.DB_HOST || '',
    dbDatabase: process.env.DB_DATABASE || '',
    dbPassword: process.env.DB_PASSWORD || '',
    dbPort: parseInt(process.env.DB_PORT || '5432', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    dbSSL: process.env.DB_SSL === 'true'
};

export default config;