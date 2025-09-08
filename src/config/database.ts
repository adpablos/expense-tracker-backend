export interface DatabaseConfig {
  user: string;
  host: string;
  database: string;
  password: string;
  port: number;
  ssl: boolean | { rejectUnauthorized: boolean };
}

const fromDatabaseUrl = (url: string): Partial<DatabaseConfig> | undefined => {
  try {
    const u = new URL(url);
    const [user, password] = [decodeURIComponent(u.username || ''), decodeURIComponent(u.password || '')];
    const host = u.hostname;
    const port = u.port ? parseInt(u.port, 10) : 5432;
    const database = u.pathname?.replace(/^\//, '') || '';
    const ssl = /sslmode=require|ssl=true/i.test(u.search) || process.env.DB_SSL === 'true';
    if (!host || !database) return undefined;
    return { user, password, host, port, database, ssl };
  } catch {
    return undefined;
  }
};

export const createDatabaseConfig = (): DatabaseConfig => {
  if (process.env.NODE_ENV === 'test') {
    return {
      user: 'test_user',
      host: 'localhost',
      database: 'test_db',
      password: 'test_password',
      port: 5432,
      ssl: false,
    };
  }

  // Prefer explicit DB_* vars when present
  if (process.env.DB_USER && process.env.DB_HOST && process.env.DB_DATABASE && process.env.DB_PORT) {
    return {
      user: process.env.DB_USER!,
      host: process.env.DB_HOST!,
      database: process.env.DB_DATABASE!,
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT!, 10),
      ssl: process.env.DB_SSL === 'true',
    };
  }

  // Fallback to common PG_* variables (Railway/Heroku style)
  if (process.env.PGUSER && process.env.PGHOST && process.env.PGDATABASE && process.env.PGPORT) {
    return {
      user: process.env.PGUSER!,
      host: process.env.PGHOST!,
      database: process.env.PGDATABASE!,
      password: process.env.PGPASSWORD || '',
      port: parseInt(process.env.PGPORT!, 10),
      ssl: process.env.DB_SSL === 'true' || /require/i.test(process.env.PGSSLMODE || ''),
    };
  }

  // Fallback to DATABASE_URL
  const fromUrl = process.env.DATABASE_URL ? fromDatabaseUrl(process.env.DATABASE_URL) : undefined;
  if (fromUrl) {
    return {
      user: fromUrl.user || '',
      host: fromUrl.host!,
      database: fromUrl.database!,
      password: fromUrl.password || '',
      port: fromUrl.port || 5432,
      ssl: fromUrl.ssl ?? false,
    } as DatabaseConfig;
  }

  throw new Error(
    'Missing required database environment variables (expected DB_*, or PG* vars, or DATABASE_URL)'
  );
};
