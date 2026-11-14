import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();
const isGenerateCommand = process.argv.some((arg) => arg === 'generate');

const dbCredentials = databaseUrl
  ? {
      url: databaseUrl,
    }
  : (() => {
      const sqlHost = process.env.SQL_HOST;
      const sqlDbName = process.env.SQL_DB_NAME;
      const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
      const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

      if (!sqlHost || !sqlDbName || !user || !password) {
        if (isGenerateCommand) {
          return {
            url: 'postgresql://postgres:postgres@localhost:5432/brave',
          };
        }
        throw new Error(
          'Either DATABASE_URL or SQL_HOST/SQL_DB_NAME/SQL_ADMIN_USER/SQL_ADMIN_PASSWORD must be set.'
        );
      }

      return {
        host: sqlHost,
        user,
        password,
        database: sqlDbName,
        ssl: false,
      };
    })();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials,
  verbose: true,
});
