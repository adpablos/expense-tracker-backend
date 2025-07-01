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
    dbUser: process.env.DB_USER || (() => {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('DB_USER environment variable is required in production');
        }
        return 'defaultuser';
    })(),
    dbHost: process.env.DB_HOST || (() => {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('DB_HOST environment variable is required in production');
        }
        return 'localhost';
    })(),
    dbDatabase: process.env.DB_DATABASE || (() => {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('DB_DATABASE environment variable is required in production');
        }
        return 'defaultdb';
    })(),
    dbPassword: process.env.DB_PASSWORD || (() => {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('DB_PASSWORD environment variable is required in production');
        }
        return 'defaultpassword';
    })(),
    dbPort: parseInt(process.env.DB_PORT || '5432', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    dbSSL: process.env.DB_SSL === 'true'
};

export default config;