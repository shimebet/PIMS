import 'dotenv/config';
import { PrismaService } from './src/database/prisma/prisma.service.js';

const PERMISSION_CODE = 'patient.deactivate';

const AUTHORIZED_ROLES = [
  'SYSTEM_ADMIN',
  'OFFICE_MANAGER',
] as const;

async function main(): Promise<void> {
  const prisma = new PrismaService();

  try {
    await prisma.$connect();

    const result = await prisma.$transaction(async (tx) => {
      const roles = await tx.role.findMany({
        where: {
          code: {
            in: [...AUTHORIZED_ROLES],
          },
        },
        select: {
          id: true,
          code: true,
        },
      });

      for (const code of AUTHORIZED_ROLES) {
        if (!roles.some((role) => role.code === code)) {
          throw new Error(`Required role missing: ${code}`);
        }
      }

      const permission = await tx.permission.upsert({
        where: {
          code: PERMISSION_CODE,
        },
        update: {},
        create: {
          code: PERMISSION_CODE,
          name: 'Deactivate Patient',
          module: 'PATIENT',
          description:
            'Deactivate patient registration without deleting clinical history',
        },
        select: {
          id: true,
          code: true,
        },
      });

      for (const role of roles) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }

      return {
        permission: permission.code,
        roles: roles.map((role) => role.code),
      };
    });

    const verified = await prisma.role.findMany({
      where: {
        code: {
          in: [...AUTHORIZED_ROLES],
        },
      },
      select: {
        code: true,
        permissions: {
          where: {
            permission: {
              code: PERMISSION_CODE,
            },
          },
          select: {
            permissionId: true,
          },
        },
      },
    });

    for (const code of AUTHORIZED_ROLES) {
      const role = verified.find((item) => item.code === code);

      if (!role || role.permissions.length !== 1) {
        throw new Error(`Verification failed for ${code}`);
      }
    }

    console.log('Permission:', result.permission);
    console.log('Assigned roles:', result.roles.join(', '));
    console.log('Verification: PASSED');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown error';

  console.error('Registration failed:', message);
  process.exitCode = 1;
});