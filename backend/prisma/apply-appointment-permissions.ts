import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

const requiredEnvironmentVariables = [
  'DATABASE_HOST',
  'DATABASE_PORT',
  'DATABASE_USER',
  'DATABASE_PASSWORD',
  'DATABASE_NAME',
] as const;

for (const key of requiredEnvironmentVariables) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const port = Number(process.env.DATABASE_PORT);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Invalid DATABASE_PORT');
}

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST!,
  port,
  user: process.env.DATABASE_USER!,
  password: process.env.DATABASE_PASSWORD!,
  database: process.env.DATABASE_NAME!,
  connectionLimit: 5,
});

const prisma = new PrismaClient({
  adapter,
});

const permissions = [
  {
    code: 'appointment.create',
    name: 'Create Appointment',
    module: 'APPOINTMENT',
  },
  {
    code: 'appointment.read',
    name: 'View Appointments',
    module: 'APPOINTMENT',
  },
  {
    code: 'appointment.update',
    name: 'Update Appointment',
    module: 'APPOINTMENT',
  },
  {
    code: 'appointment.cancel',
    name: 'Cancel Appointment',
    module: 'APPOINTMENT',
  },
];

async function main() {
  console.log('Applying PIMS appointment permissions...');

  const result = await prisma.$transaction(async (tx) => {
    const adminRole = await tx.role.findUnique({
      where: {
        code: 'SYSTEM_ADMIN',
      },
      select: {
        id: true,
      },
    });

    if (!adminRole) {
      throw new Error(
        'SYSTEM_ADMIN role not found. No permissions were changed.',
      );
    }

    for (const permission of permissions) {
      const saved = await tx.permission.upsert({
        where: {
          code: permission.code,
        },
        update: {
          name: permission.name,
          module: permission.module,
        },
        create: permission,
      });

      await tx.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: saved.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: saved.id,
        },
      });
    }

    const verified = await tx.rolePermission.findMany({
      where: {
        roleId: adminRole.id,
        permission: {
          code: {
            in: permissions.map((item) => item.code),
          },
        },
      },
      select: {
        permission: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    if (verified.length !== permissions.length) {
      throw new Error(
        'Appointment permission verification failed. Transaction rolled back.',
      );
    }

    return verified;
  }, {
    maxWait: 20000,
    timeout: 60000,
  });

  console.log('Appointment permissions successfully applied:');

  for (const entry of result) {
    console.log(
      `  ${entry.permission.code} - ${entry.permission.name}`,
    );
  }

  console.log(
    'All four permissions are assigned to SYSTEM_ADMIN.',
  );
}

main()
  .catch((error: unknown) => {
    console.error('Permission update failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

