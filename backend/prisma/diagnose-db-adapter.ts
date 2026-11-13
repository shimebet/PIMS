import 'dotenv/config';

import mariadb from 'mariadb';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

const config = {
  host: process.env.DATABASE_HOST ?? '127.0.0.1',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? 'pims_app',
  password: process.env.DATABASE_PASSWORD ?? '',
  database: process.env.DATABASE_NAME ?? 'pims',
};

function printError(error: unknown) {
  if (error && typeof error === 'object') {
    const e = error as {
      name?: string;
      message?: string;
      code?: string;
      errno?: number;
      sqlState?: string;
      cause?: unknown;
    };

    console.error('Name:', e.name);
    console.error('Message:', e.message);
    console.error('Code:', e.code);
    console.error('Errno:', e.errno);
    console.error('SQL state:', e.sqlState);

    if (e.cause) {
      console.error('Cause:', e.cause);
    }
  } else {
    console.error(error);
  }
}

async function main() {
  console.log('=== CONNECTION CONFIGURATION ===');

  console.log('Host:', config.host);
  console.log('Port:', config.port);
  console.log('User:', config.user);
  console.log('Database:', config.database);
  console.log('Password configured:', config.password.length > 0);

  console.log('\n=== DIRECT MARIADB DRIVER TEST ===');

  try {
    const connection = await mariadb.createConnection({
      ...config,
      connectTimeout: 10000,
    });

    try {
      const rows = await connection.query(
        'SELECT DATABASE() AS database_name, VERSION() AS version',
      );

      console.log('Direct driver connection: SUCCESS');
      console.log('Database:', rows[0]?.database_name);
      console.log('Server version:', rows[0]?.version);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Direct driver connection: FAILED');
    printError(error);
  }

  console.log('\n=== PRISMA ADAPTER TEST ===');

  const adapter = new PrismaMariaDb({
    ...config,
    connectionLimit: 5,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    const result = await prisma.$queryRaw<
      Array<{ database_name: string | null }>
    >`SELECT DATABASE() AS database_name`;

    console.log('Prisma adapter connection: SUCCESS');
    console.log('Database:', result[0]?.database_name);
  } catch (error) {
    console.error('Prisma adapter connection: FAILED');
    printError(error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  printError(error);
  process.exitCode = 1;
});
