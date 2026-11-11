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
  const permissions = [
    {
      code: 'report.read',
      name: 'View Health Office Reports',
      module: 'REPORT',
    },
    {
      code: 'report.export',
      name: 'Export Health Office Reports',
      module: 'REPORT',
    },
  ];

  const systemAdminRole = await prisma.role.findUniqueOrThrow({
    where: { code: 'SYSTEM_ADMIN' },
  });

  for (const item of permissions) {
    const permission = await prisma.permission.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        module: item.module,
      },
      create: item,
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: systemAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: systemAdminRole.id,
        permissionId: permission.id,
      },
    });

    console.log(`Configured: ${permission.code}`);
  }

  console.log('Reporting permissions configured successfully.');
}

main()
  .catch((error) => {
    console.error('Reporting permission setup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });