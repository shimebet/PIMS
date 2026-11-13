import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? '127.0.0.1',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? 'pims_app',
  password: process.env.DATABASE_PASSWORD ?? '',
  database: process.env.DATABASE_NAME ?? 'pims',
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('=== PRISMA DATABASE DIAGNOSTIC ===');

  console.log('Testing database connection...');

  await prisma.$connect();

  console.log('Prisma connection established.');

  const result = await prisma.$queryRaw<
    Array<{ database_name: string | null }>
  >`SELECT DATABASE() AS database_name`;

  console.log('Database query successful.');

  console.log(
    'Connected database:',
    result[0]?.database_name ?? 'Unknown',
  );

  const count = await prisma.permission.count();

  console.log('Existing permission count:', count);

  console.log('READ-ONLY DATABASE TEST PASSED');
}

main()
  .catch((error: unknown) => {
    console.error('DATABASE DIAGNOSTIC FAILED');

    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error
    ) {
      console.error('Prisma error code:', error.code);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
